import logo from './logo.svg';
import './App.css';
import React, {useState, useRef} from 'react'
import Board from './component/Board'

function App() {

  const [inputValue, setInputValue] = useState("");
  const [allNumber, setAllNumber] = useState([]);
  const nextId = useRef(1);


  const addNum =()=>{

    if (inputValue.trim() == "") return;

    const newItem = {
      id : nextId.current,
      text : inputValue
    }

    setAllNumber([...allNumber, newItem])
    nextId.current +=1;
    setInputValue("");
  }

  const deleteItem=(id)=>{
    const updateNumber = allNumber.filter(item=>item.id !==id);
    setAllNumber(updateNumber);
  }




  const sendToServer = () => {
    fetch("http://localhost:5000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(allNumber.map(item => item.text)),
    })
      .then(res => res.json())
      .then(data => {
        console.log("분석 결과:", data);
        setResult(data);  //<- state에 저장해서 UI에 표시도 가능
      })
      .catch(err => {
        console.error("서버 요청 중 오류발생: ", err);
      });
  };

  const [result, setResult] = useState([]);

  const allHeaders = result.length >0 ? ['phone_number', ...Object.keys(result[0]).filter(k=>k !== 'phone_number')] : [];


  return (
    <div className='box'>
      <h1>Text phone Number</h1> <br/>
      <input type="text" value={inputValue} className='textBox'
      
      onKeyDown={(event)=>{
        if (event.key ==='Enter') addNum();
      }}
      
      onChange={(event)=>{
        setInputValue(event.target.value)
      }}/>
      <button onClick={addNum} className='btn'>추가</button>

      <Board allNumber ={allNumber} onDelete={deleteItem}/>

        <button className='btn' onClick={sendToServer}>실행</button>

        {result.length > 0 && (
        <div className="result-box">
          <h2>분석 결과</h2>
          <table border="1">
            <thead>
              <tr>
                {allHeaders.map((key, i) => <th key={i}>{key}</th>)}
                
              </tr>
            </thead>
            <tbody>
              {result.map((row, i) => (
                <tr key={i}>
                  {allHeaders.map((key,j) => (
                    <td key={j}>{row[key]}</td>
                  ))}
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
