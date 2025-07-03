import React from 'react'
import PhoneNumber from './PhoneNumber'
function Board(props){
    return(

        <div>
            <h3>추가한 번호</h3>
            {props.allNumber.map((item)=> (
                <PhoneNumber
                item={item}
                key={item.id}
                text={item.text}
                id={item.id}
                deleteItem={props.onDelete}
                />
            )
            )}
        </div>

    )
}

export default Board