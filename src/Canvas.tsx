import React, {useLayoutEffect, useState, useRef, MutableRefObject} from 'react'
import './Canvas.css'

function Canvas() {
    return (
        <div className="Canvas">
            <Box/>
        </div>
    )
}

function Box() {
    const boxRef = useRef() as MutableRefObject<HTMLDivElement>
    const [boxHeld, setBoxHeld] = useState(false)
    const [holdPosition, setHoldPosition] = useState({x: 0, y: 0})
    const [origin, setOrigin] = useState({x: 0, y: 0})

    const setBoxHeldToTrue = (event: MouseEvent) => {
        setHoldPosition({
            x: event.clientX - origin.x,
            y: event.clientY - origin.y
        })
        setBoxHeld(true)
    }
    const setBoxHeldToFalse = () => setBoxHeld(false)

    const dragBox = (event: MouseEvent) => {
        if (boxHeld) {
            event.stopImmediatePropagation()
            event.preventDefault()

            const newOrigin = {
                x: event.clientX - holdPosition.x,
                y: event.clientY - holdPosition.y
            }
            setOrigin(newOrigin)

            boxRef.current.style.transform = `translate(${newOrigin.x}px, ${newOrigin.y}px)`
        }
    }

    useLayoutEffect(() => {
        const box = boxRef.current
        box.addEventListener('mousedown', setBoxHeldToTrue)
        window.addEventListener('mouseup', setBoxHeldToFalse)
        window.addEventListener('mousemove', dragBox)
        return () => {
            box.removeEventListener('mousedown', setBoxHeldToTrue)
            window.removeEventListener('mouseup', setBoxHeldToFalse)
            window.removeEventListener('mousemove', dragBox)
        }
    })

    return <div className="Box" ref={boxRef}/>
}

export default Canvas
