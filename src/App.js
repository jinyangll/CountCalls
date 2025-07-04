import React, { useState, useRef } from "react";
import Board from "./component/Board";
import "./App.css";

function App() {
  const [inputValue, setInputValue] = useState("");
  const [allNumber, setAllNumber] = useState([]);
  const nextId = useRef(1);
  const [result, setResult] = useState([]);

  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const addNum = () => {
    const cleaned = inputValue.trim().replace(/\s+/g, "");
    if (cleaned === "") {
      setErrorMessage("전화번호를 입력해주세요.");
      return;
    }
    setErrorMessage("");

    if (allNumber.some(item => item.text === cleaned)) {
      setErrorMessage("이미 추가된 전화번호입니다.");
      return;
    }

    const newItem = { id: nextId.current, text: cleaned };
    setAllNumber([...allNumber, newItem]);
    nextId.current += 1;
    setInputValue("");
  };

  const deleteItem = (id) => {
    setAllNumber(allNumber.filter((item) => item.id !== id));
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith(".xlsx")) {
      setSelectedFile(file);
      setErrorMessage("");
      console.log("파일이 선택되었습니다:", file.name, file);
    } else {
      setSelectedFile(null);
      setErrorMessage("유효한 .xlsx 엑셀 파일을 선택해주세요.");
      console.log("유효하지 않은 파일이 선택되었습니다.");
    }
  };

  const sendToServer = () => {
    console.log("sendToServer 호출됨");
    console.log("현재 selectedFile 상태:", selectedFile);
    console.log("현재 allNumber 상태:", allNumber.map((item) => item.text));

    if (!selectedFile) {
      setErrorMessage("엑셀 파일을 먼저 선택해주세요.");
      return;
    }
    if (allNumber.length === 0) {
      setErrorMessage("분석할 전화번호를 최소 하나 이상 추가해주세요.");
      return;
    }

    setErrorMessage("");
    setIsLoading(true);
    setResult([]);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("numbers", JSON.stringify(allNumber.map((item) => item.text)));

    for (let pair of formData.entries()) {
      console.log(pair[0]+ ', ' + pair[1]);
    }

    fetch(`${API_BASE_URL}/analyze`, {
      method: "POST",
      body: formData,
    })
      .then((res) => {
        setIsLoading(false);
        if (!res.ok) {
          return res.json().then(errorData => {
            throw new Error(errorData.error || "서버 오류가 발생했습니다.");
          });
        }
        return res.json();
      })
      .then((data) => {
        setResult(data);
      })
      .catch((err) => {
        console.error("서버 요청 중 오류발생: ", err);
        setErrorMessage(`요청 실패: ${err.message || "알 수 없는 오류"}`);
      });
  };

  // --- 수정된 부분 시작: specialNumbers 필터링 로직 변경 ---
  const specialNumbers = result.length
    ? Object.keys(result[0])
        .filter(
          (key) =>
            key !== "phone_number" &&
            key !== "total" && // '최종총횟수' 대신 'total'로 변경
            // '_착신', '_발신', '_총' 접미사를 가진 키만 필터링
            (key.endsWith("_착신") || key.endsWith("_발신") || key.endsWith("_총"))
        )
        // 접미사를 제거하여 고유한 special 번호만 추출
        .map((key) => key.split("_")[0])
        .filter((v, i, self) => self.indexOf(v) === i) // 중복 제거
    : [];
  // --- 수정된 부분 끝 ---

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
        className="textBox" /* App.css의 .textBox 클래스 사용 */
        onKeyDown={(event) => {
          if (event.key === "Enter") addNum();
        }}
        onChange={(event) => setInputValue(event.target.value)}
      />
      <button onClick={addNum} className="btn">
        추가
      </button>

      <Board allNumber={allNumber} onDelete={deleteItem} />

      <div style={{ marginTop: '20px', marginBottom: '20px' }}>
        <label htmlFor="excel-upload" style={{ display: 'block', marginBottom: '5px' }}>
          엑셀 파일 업로드 (.xlsx)
        </label>
        <input
          type="file"
          id="excel-upload"
          accept=".xlsx"
          onChange={handleFileChange}
          style={{ border: '1px solid #ccc', padding: '8px', borderRadius: '4px' }}
        />
        {selectedFile && (
          <p style={{ fontSize: '0.9em', color: '#555', marginTop: '5px' }}>
            선택된 파일: {selectedFile.name}
          </p>
        )}
      </div>

      {errorMessage && (
        <div style={{ color: 'red', border: '1px solid red', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>
          <strong>오류:</strong> {errorMessage}
        </div>
      )}

      <button
        className="btn"
        onClick={sendToServer}
        disabled={isLoading}
      >
        {isLoading ? "분석 중..." : "실행"}
      </button>

      {isLoading && (
        <div style={{ marginTop: '10px', textAlign: 'center', color: '#555' }}>
          데이터를 분석하고 있습니다...
        </div>
      )}

      {result.length > 0 && (
        <div className="result-box" style={{ overflowX: "scroll", marginTop: '20px' }}>
          <h2>분석 결과</h2>
          <table border="1" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ padding: '8px', border: '1px solid #ddd', backgroundColor: '#f2f2f2' }}>phone_number</th>
                {specialNumbers.map((special) => (
                  <th key={special} colSpan={3} style={{ textAlign: "center", padding: '8px', border: '1px solid #ddd', backgroundColor: '#f2f2f2' }}>
                    {special}
                  </th>
                ))}
                {/* --- 수정된 부분: '최종총횟수' -> 'Total' --- */}
                <th rowSpan={2} style={{ padding: '8px', border: '1px solid #ddd', backgroundColor: '#f2f2f2' }}>Total</th>
                {/* --- 수정된 부분 끝 --- */}
              </tr>
              <tr>
                {specialNumbers.map((special) => (
                  <React.Fragment key={special}>
                    {/* --- 수정된 부분: '착신횟수' -> '착신' --- */}
                    <th style={{ padding: '8px', border: '1px solid #ddd', backgroundColor: '#f2f2f2' }}>착신</th>
                    {/* --- 수정된 부분: '발신횟수' -> '발신' --- */}
                    <th style={{ padding: '8px', border: '1px solid #ddd', backgroundColor: '#f2f2f2' }}>발신</th>
                    {/* --- 수정된 부분: '총횟수' -> '총' --- */}
                    <th style={{ padding: '8px', border: '1px solid #ddd', backgroundColor: '#f2f2f2' }}>총</th>
                    {/* --- 수정된 부분 끝 --- */}
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.map((row, i) => (
                  <tr key={i}>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.phone_number}</td>
                    {specialNumbers.map((special) => (
                      <React.Fragment key={special}>
                        {/* --- 수정된 부분: 데이터 접근 컬럼 이름 변경 ('_착신횟수' -> '_착신') --- */}
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row[`${special}_착신`] ?? 0}</td>
                        {/* --- 수정된 부분: 데이터 접근 컬럼 이름 변경 ('_발신횟수' -> '_발신') --- */}
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row[`${special}_발신`] ?? 0}</td>
                        {/* --- 수정된 부분: 데이터 접근 컬럼 이름 변경 ('_총횟수' -> '_총') --- */}
                        <td style={{ padding: '8px', 'border': '1px solid #ddd' }}>{row[`${special}_총`] ?? 0}</td>
                        {/* --- 수정된 부분 끝 --- */}
                      </React.Fragment>
                    ))}
                    {/* --- 수정된 부분: 데이터 접근 컬럼 이름 변경 ('최종총횟수' -> 'total') --- */}
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.total}</td>
                    {/* --- 수정된 부분 끝 --- */}
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
