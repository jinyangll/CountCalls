import React from 'react'

function PhoneNumber(props){
    return(
        <div className='phoneNumber'>
            {props.item.text}
            <button className="xBtn" onClick={()=>props.deleteItem(props.id)}>x</button>
        </div>

    )
}

export default PhoneNumber