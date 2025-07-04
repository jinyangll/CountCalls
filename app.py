from flask import Flask, request, jsonify # jsonify 추가
from flask_cors import CORS
import pandas as pd
import json # json 모듈 추가

app = Flask(__name__)
CORS(app)

@app.route("/analyze", methods=["POST"])
def analyze():
    # --- 수정된 부분 시작: 파일 및 전화번호 목록 처리 ---
    # 1. 엑셀 파일 처리
    if 'file' not in request.files:
        # 'file'이라는 이름의 파일이 요청에 포함되지 않은 경우
        return jsonify({"error": "엑셀 파일이 업로드되지 않았습니다."}), 400
    file = request.files['file']
    if file.filename == '':
        # 파일은 포함되었지만 파일 이름이 없는 경우 (선택되지 않은 경우)
        return jsonify({"error": "선택된 엑셀 파일이 없습니다."}), 400

    # 2. 전화번호 목록 처리 (FormData의 'numbers' 필드에서 JSON 문자열로 받음)
    all_input_str = request.form.get('numbers')
    if not all_input_str:
        # 'numbers' 필드가 없는 경우
        return jsonify({"error": "분석할 전화번호 목록이 제공되지 않았습니다."}), 400

    try:
        # JSON 문자열을 파이썬 리스트로 파싱
        all_input = json.loads(all_input_str)
        if not isinstance(all_input, list):
            # 파싱된 결과가 리스트가 아닌 경우
            return jsonify({"error": "전화번호 목록 형식이 올바르지 않습니다. (리스트 형태여야 함)"}), 400
    except json.JSONDecodeError:
        # JSON 파싱 중 오류 발생
        return jsonify({"error": "제공된 전화번호 목록의 JSON 형식이 잘못되었습니다."}), 400
    # --- 수정된 부분 끝 ---

    try:
        # --- 수정된 부분: 업로드된 파일 객체를 pandas.read_excel에 직접 전달 ---
        # FileStorage 객체는 파일처럼 동작하므로 직접 전달 가능
        df = pd.read_excel(file)
        # --- 수정된 부분 끝 ---
    except Exception as e:
        # 엑셀 파일 읽기 중 발생할 수 있는 오류 처리
        return jsonify({"error": f"엑셀 파일을 읽는 중 오류가 발생했습니다: {str(e)}"}), 500

    col_receive = next((col for col in df.columns if '착신자' in col.strip()), None)
    col_send = next((col for col in df.columns if '발신자' in col.strip()), None)

    if col_receive is None or col_send is None:
        # --- 수정된 부분: Exception 대신 jsonify로 오류 응답 반환 ---
        return jsonify({"error": "엑셀파일에 '착신자' 또는 '발신자'가 들어가는 열이 없습니다."}), 400
        # --- 수정된 부분 끝 ---

    df = df[[col_receive, col_send]].copy()
    df.columns = ['receive', 'send']

    df['receive'] = df['receive'].astype(str).str.replace('-', '', regex=False)
    df['send'] = df['send'].astype(str).str.replace('-', '', regex=False)

    df['receive_tail'] = df['receive'].str[-8:]
    df['send_tail'] = df['send'].str[-8:]

    all_phone_numbers = pd.Index(df['receive_tail']).append(pd.Index(df['send_tail'])).unique()
    result_df = pd.DataFrame({'phone_number': all_phone_numbers})

    # all_input이 이미 리스트이므로 set으로 변환 후 다시 리스트로 변환
    all_input = list(set(all_input))

    for special in all_input:
        cond_recv = df['receive_tail'] == special
        cond_send = df['send_tail'] == special

        senders = df.loc[cond_recv, 'send_tail'].value_counts()
        receivers = df.loc[cond_send, 'receive_tail'].value_counts()
        total = senders.add(receivers, fill_value=0).astype(int)

        temp_df = pd.DataFrame({
            'phone_number': total.index,
            f'{special}_착신횟수': senders.reindex(total.index, fill_value=0).astype(int),
            f'{special}_발신횟수': receivers.reindex(total.index, fill_value=0).astype(int),
            f'{special}_총횟수': total.values
        })

        result_df = result_df.merge(temp_df, on='phone_number', how='left')

    result_df = result_df.fillna(0).astype({col: int for col in result_df.columns if col != 'phone_number'})

    result_df = result_df[~result_df['phone_number'].isin(all_input)].copy()

    # 여기가 핵심! 총횟수 컬럼들만 합산해서 단일 최종총횟수 컬럼 생성
    total_cols = [col for col in result_df.columns if col.endswith('_총횟수')]
    result_df['최종총횟수'] = result_df[total_cols].sum(axis=1)

    result_df = result_df.sort_values(by='최종총횟수', ascending=False).reset_index(drop=True)

    # --- 수정된 부분: jsonify를 사용하여 JSON 응답 반환 ---
    return jsonify(result_df.to_dict(orient="records"))
    # --- 수정된 부분 끝 ---

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000) # 로컬 테스트를 위해 host와 port 명시
