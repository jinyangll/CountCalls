from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import json
import os

app = Flask(__name__)
CORS(app)

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Flask backend is running and ready to receive requests at /analyze"}), 200

@app.route("/analyze", methods=["POST"])
def analyze():
    if 'file' not in request.files:
        return jsonify({"error": "엑셀 파일이 업로드되지 않았습니다."}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "선택된 엑셀 파일이 없습니다."}), 400

    ext = os.path.splitext(file.filename)[-1].lower()
    
    all_input_str = request.form.get('numbers')
    if not all_input_str:
        return jsonify({"error": "분석할 전화번호 목록이 제공되지 않았습니다."}), 400

    try:
        all_input = json.loads(all_input_str)
        if not isinstance(all_input, list):
            return jsonify({"error": "전화번호 목록 형식이 올바르지 않습니다. (리스트 형태여야 함)"}), 400
    except json.JSONDecodeError:
        return jsonify({"error": "제공된 전화번호 목록의 JSON 형식이 잘못되었습니다."}), 400
        
    # 수정
    try:
        if ext == '.xlsx':
            df = pd.read_excel(file, engine='openpyxl')
        elif ext == '.xls':
            df = pd.read_excel(file, engine='xlrd')
        else:
            return jsonify({"error": "지원하지 않는 파일 형식입니다. (.xls 또는 .xlsx만 허용됨)"}), 400
    except Exception as e:
        return jsonify({"error": f"엑셀 파일을 읽는 중 오류가 발생했습니다: {str(e)}"}), 500

    #####
    
    col_receive = next((col for col in df.columns if '착신자' in col.strip()), None)
    col_send = next((col for col in df.columns if '발신자' in col.strip()), None)

    if col_receive is None or col_send is None:
        return jsonify({"error": "엑셀파일에 '착신' 또는 '발신'가 들어가는 열이 없습니다."}), 400

    df = df[[col_receive, col_send]].copy()
    df.columns = ['receive', 'send']

    df['receive'] = df['receive'].astype(str).str.replace('-', '', regex=False)
    df['send'] = df['send'].astype(str).str.replace('-', '', regex=False)

    df['receive_tail'] = df['receive'].str[-8:]
    df['send_tail'] = df['send'].str[-8:]

    all_phone_numbers = pd.Index(df['receive_tail']).append(pd.Index(df['send_tail'])).unique()
    result_df = pd.DataFrame({'phone_number': all_phone_numbers})

    all_input = list(set(all_input))

    for special in all_input:
        cond_recv = df['receive_tail'] == special
        cond_send = df['send_tail'] == special

        senders = df.loc[cond_recv, 'send_tail'].value_counts()
        receivers = df.loc[cond_send, 'receive_tail'].value_counts()
        total = senders.add(receivers, fill_value=0).astype(int)

        temp_df = pd.DataFrame({
            'phone_number': total.index,
            f'{special}_착신': senders.reindex(total.index, fill_value=0).astype(int),
            f'{special}_발신': receivers.reindex(total.index, fill_value=0).astype(int),
            f'{special}_총': total.values
        })

        result_df = result_df.merge(temp_df, on='phone_number', how='left')

    result_df = result_df.fillna(0).astype({col: int for col in result_df.columns if col != 'phone_number'})

    result_df = result_df[~result_df['phone_number'].isin(all_input)].copy()

    total_cols = [col for col in result_df.columns if col.endswith('_총')] 
    result_df['total'] = result_df[total_cols].sum(axis=1)

    result_df = result_df.sort_values(by='total', ascending=False).reset_index(drop=True)

    return jsonify(result_df.to_dict(orient="records"))

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)
