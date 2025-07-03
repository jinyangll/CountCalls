from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd

app = Flask(__name__)
CORS(app)

@app.route("/analyze", methods=["POST"])

def analyze():
    all_input = request.json
    df = pd.read_excel(r"C:\Users\kjyng\Desktop\통화내역(테스트).xlsx")

    col_receive = next((col for col in df.columns if '착신자' in col.strip()), None)
    col_send = next((col for col in df.columns if '발신자' in col.strip()), None)

    if col_receive is None or col_send is None:
        raise Exception('엑셀파일에 착신자, 발신자가 들어가는 열이 없습니다')

    df = df[[col_receive, col_send]].copy()

    df.columns = ['receive', 'send']

    df['receive'] = df['receive'].astype(str)
    df['send'] = df['send'].astype(str)

    df['receive_clean'] = df['receive'].str.replace('-', '', regex=False)
    df['send_clean'] = df['send'].str.replace('-', '', regex=False)

    df['receive_tail'] = df['receive_clean'].str[-8:]
    df['send_tail'] = df['send_clean'].str[-8:]


    

    # 중복제거
    all_input = list(set(all_input))

    all_numbers = pd.Index(df['receive_tail']).append(pd.Index(df['send_tail'])).unique()

    result = pd.DataFrame(all_numbers, columns=['phone_number'])

    def count_calls_with_special(df, special):
        cdd_receive = df['receive_tail'] == special
        cdd_send = df['send_tail'] == special

        receive_side = df.loc[cdd_send, 'receive_tail'].value_counts()
        send_side = df.loc[cdd_receive, 'send_tail'].value_counts()

        total_counts = receive_side.add(send_side, fill_value=0)
        return {
            'total_counts' : total_counts,
            'receive_side' : receive_side,
            'send_side': send_side
        }


    for x in all_input:
        counts_dict = count_calls_with_special(df, x)
        total_counts = counts_dict['total_counts']
        receive_side = counts_dict['receive_side']
        send_side = counts_dict['send_side']


        result[x] = result['phone_number'].map(total_counts).fillna(0).astype(int)

        if 'send' not in result:
            result['send'] = result['phone_number'].map(receive_side).fillna(0).astype(int)
        else:
            result['send'] += result['phone_number'].map(receive_side).fillna(0).astype(int)
        
        if 'receive' not in result:
            result['receive'] = result['phone_number'].map(send_side).fillna(0).astype(int)
        else:
            result['receive'] += result['phone_number'].map(send_side).fillna(0).astype(int)
        



    # 스페셜 번호 자기자신 제외하기
    result = result[~result['phone_number'].isin(all_input)].copy()

    result['total'] = result[all_input].sum(axis=1)

    result = result.sort_values(by='total', ascending=False).reset_index(drop=True)

    result = result.rename(columns={
    'send': '총 발신 횟수',
    'receive': '총 착신 횟수',
    'total' : 'total(착신+발신)'
    })

    return result.to_json(orient="records", force_ascii=False)

if __name__ == "__main__":
    app.run(debug=True)

# print(result)