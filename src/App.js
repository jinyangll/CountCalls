import React, { useState, useRef } from "react";
import Board from "./component/Board";
import "./App.css";

function App() {
  const [inputValue, setInputValue] = useState("");
  const [allNumber, setAllNumber] = useState([]);
  const nextId = useRef(1);
  const [result, setResult] = useState([]);

  const addNum = () => {
    const cleaned = inputValue.trim().replace(/\s+/g, "");
    if (cleaned === "") return;

    const newItem = { id: nextId.current, text: cleaned };
    setAllNumber([...allNumber, newItem]);
    nextId.current += 1;
    setInputValue("");
  };

  const deleteItem = (id) => {
    setAllNumber(allNumber.filter((item) => item.id !== id));
  };

  const sendToServer = () => {
    fetch("http://localhost:5000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(allNumber.map((item) => item.text)),
    })
      .then((res) => res.json())
      .then((data) => {
        setResult(data);
      })
      .catch((err) => {
        console.error("서버 요청 중 오류발생: ", err);
      });
  };

  // special 번호 목록 (최종총횟수 제외)
  const specialNumbers = result.length
    ? Object.keys(result[0])
        .filter(
          (key) =>
            key !== "phone_number" &&
            key !== "최종총횟수"
        )
        // _총횟수, _착신횟수, _발신횟수 중에서 unique special 번호만 뽑기
        .map((key) => key.split("_")[0])
        .filter((v, i, self) => self.indexOf(v) === i)
    : [];

  return (
    <div className="box">
      <h1>Text phone Number</h1>
      <br />
      <p>
        전화번호는 010과 -를 제외하고 입력하세요, <br />
        (번호 사이의 띄어쓰기 유무는 상관없음)
      </p>
      <p>010-1111-2222 (x)</p>
      <p>1111 2222 (o) / 11112222 (o)</p>

      <input
        type="text"
        value={inputValue}
        className="textBox"
        onKeyDown={(event) => {
          if (event.key === "Enter") addNum();
        }}
        onChange={(event) => setInputValue(event.target.value)}
      />
      <button onClick={addNum} className="btn">
        추가
      </button>

      <Board allNumber={allNumber} onDelete={deleteItem} />

      <button className="btn" onClick={sendToServer}>
        실행
      </button>

      {result.length > 0 && (
        <div className="result-box" style={{ overflowX: "auto" }}>
          <h2>분석 결과</h2>
          <table border="1">
            <thead>
              <tr>
                <th rowSpan={2}>phone_number</th>
                {specialNumbers.map((special) => (
                  <th key={special} colSpan={3} style={{ textAlign: "center" }}>
                    {special}
                  </th>
                ))}
                <th rowSpan={2}>최종총횟수</th>
              </tr>
              <tr>
                {specialNumbers.map((special) => (
                  <React.Fragment key={special}>
                    <th>착신횟수</th>
                    <th>발신횟수</th>
                    <th>총횟수</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.map((row, i) => (
                <tr key={i}>
                  <td>{row.phone_number}</td>
                  {specialNumbers.map((special) => (
                    <React.Fragment key={special}>
                      <td>{row[`${special}_착신횟수`] ?? 0}</td>
                      <td>{row[`${special}_발신횟수`] ?? 0}</td>
                      <td>{row[`${special}_총횟수`] ?? 0}</td>
                    </React.Fragment>
                  ))}
                  <td>{row.최종총횟수}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;