import React, {useLayoutEffect, useEffect, useState, useRef, MutableRefObject} from 'react'
import * as Y from 'yjs'
import {IndexeddbPersistence} from 'y-indexeddb'
import './Canvas.css'

let doc = new Y.Doc()
const persistence = new IndexeddbPersistence('test-y-websocket', doc)
persistence.whenSynced.then(() => {
    console.log('persistence: got doc')
    const boxMap = doc.getMap('box')
    if (!boxMap.has('origin')) {
        boxMap.set('origin', {x: 0, y: 0})
    }
})

function Canvas() {
    const [docReady, setDocReady] = useState(doc.getMap('box').has('origin'))

    useEffect(() => {
        // Show Box on Doc Ready effect
        persistence.whenSynced.then(() => setDocReady(true))
    })

    return (
        <div className="Canvas">
            {docReady && <Box/>}
        </div>
    )
}

function Box() {
    const boxRef = useRef() as MutableRefObject<HTMLDivElement>
    const [boxHeld, setBoxHeld] = useState(false)
    const [holdPosition, setHoldPosition] = useState({x: 0, y: 0})
    const [origin, setOrigin] = useState({x: 0, y: 0})

    useEffect(() => {
        // Sync Origin With Doc effect
        const docOrigin = doc.getMap('box').get('origin')
        setOrigin(docOrigin)
        boxRef.current.style.transform = `translate(${docOrigin.x}px, ${docOrigin.y}px)`

        doc.getMap('box').observe(() => {
            const docOrigin = doc.getMap('box').get('origin')
            setOrigin(docOrigin)
            boxRef.current.style.transform = `translate(${docOrigin.x}px, ${docOrigin.y}px)`
        })
    }, [boxRef])

    useLayoutEffect(() => {
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
                doc.getMap('box').set('origin', newOrigin)

                boxRef.current.style.transform = `translate(${newOrigin.x}px, ${newOrigin.y}px)`
            }
        }

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
