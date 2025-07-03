from flask import Flask, request
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

    return result_df.to_json(orient="records", force_ascii=False)

if __name__ == "__main__":
    app.run(debug=True)