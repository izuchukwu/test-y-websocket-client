import React, {useLayoutEffect, useEffect, useState, useRef, MutableRefObject} from 'react'

import * as Y from 'yjs'
import {IndexeddbPersistence} from 'y-indexeddb'
import {WebsocketProvider} from 'y-websocket'
import randomColor from 'randomcolor'

import './Canvas.css'

// Doc
let doc = new Y.Doc()

// Color
const color = randomColor({luminosity: 'light'})

// Awareness


// Persistence
const persistence = new IndexeddbPersistence('test-y-websocket', doc)
persistence.whenSynced.then(() => {
    console.log('persistence: got doc')
    const boxMap = doc.getMap('box')
    if (!boxMap.has('origin')) {
        boxMap.set('origin', {x: 0, y: 0})
    }
})

// Provider
// const provider = new WebsocketProvider('ws://localhost:5000', 'test', doc)
const provider = new WebsocketProvider('wss://izuchukwu-test-y-websocket.herokuapp.com', 'test', doc)
provider.awareness.setLocalState({color: color, cursor: null, isSelecting: false} as PeerState)
provider.on('status', (event: any) => {
    console.log(event.status, `Client identifier: ${doc.clientID}`)
})

// Awareness Types
interface AwarenessChange {
    added: Array<number>,
    updated: Array<number>,
    removed: Array<number>
}

interface PeerState {
    color: string,
    cursor: {x: number, y: number} | null,
    isSelecting: boolean
}

function Canvas() {
    const [docReady, setDocReady] = useState(doc.getMap('box').has('origin'))
    const [peers, setPeers] = useState(new Map(provider.awareness.getStates()) as Map<number, PeerState>)
    const [selectingPeer, setSelectingPeer] = useState(null as number | null)

    const canvasRef = useRef() as MutableRefObject<HTMLDivElement>

    useEffect(() => {
        // Update Peers effect

        provider.awareness.on('change', ({added, updated, removed}: AwarenessChange) => {
            // Update peers
            const newPeers = new Map(provider.awareness.getStates()) as Map<number, PeerState>
            // Remove our own peer to prevent issues
            newPeers.delete(doc.clientID)
            setPeers(newPeers)

            // Update selectingPeer
            const peerIdentifiers = Array.from(newPeers.keys())
            let newSelectingPeer = null
            for (let i = 0; i < peerIdentifiers.length; i++) {
                const peerIdentifier = peerIdentifiers[i]
                const peerState = newPeers.get(peerIdentifier)

                if (peerState && peerState.isSelecting) {
                    console.log('selecting peer: ', peerIdentifier)
                    newSelectingPeer = peerIdentifier
                    break
                }
            }
            setSelectingPeer(newSelectingPeer)
        })
    }, [])

    useEffect(() => {
        // Update Awareness Cursor effect

        const updateAwarenessCursor = (event: MouseEvent) => {
            provider.awareness.setLocalStateField('cursor', {x: event.clientX, y: event.clientY})
        }

        const removeAwarenessCursor = (event: MouseEvent) => {
            provider.awareness.setLocalStateField('cursor', null)
        }

        const canvas = canvasRef.current
        canvas.addEventListener('mousemove', updateAwarenessCursor)
        canvas.addEventListener('mouseout', removeAwarenessCursor)
        return () => {
            canvas.removeEventListener('mousemove', updateAwarenessCursor)
            canvas.removeEventListener('mouseout', removeAwarenessCursor)
        }
    }, [canvasRef])

    useEffect(() => {
        // Show Box on Doc Ready effect
        persistence.whenSynced.then(() => setDocReady(true))
    }, [])

    return (
        <div className="Canvas" ref={canvasRef}>
            <div className="Bar" style={{backgroundColor: color}}/>
            {Array.from(peers.keys()).map((peerIdentifier) => {
                const peer = peers.get(peerIdentifier)
                if (!peer || peer.color === color) return false
                return <Cursor peer={peer}/>
            })}
            <Room peers={peers}/>
            {docReady && <Box peers={peers} selectingPeer={selectingPeer}/>}
        </div>
    )
}

interface CursorProps {
    peer: PeerState
}

function Cursor({peer}: CursorProps) {
    return (
        <div
            className="Cursor"
            style={{
                visibility: peer.cursor ? 'visible' : 'hidden',
                transform: peer.cursor ? `translate(${peer.cursor.x}px, ${peer.cursor.y}px)` : ''
            }}
        >
            <svg width="15" height="20" viewBox="0 0 15 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 16.5517V0L12 12H4.96552L4.55173 12.1034L0 16.5517Z" fill="white"/>
                <path d="M9.41336 17.2759L5.68922 18.8276L0.827148 7.34482L4.65473 5.79309L9.41336 17.2759Z" fill="white"/>
                <path d="M4.83553 8.91566L2.92773 9.71655L6.13132 17.3477L8.03911 16.5468L4.83553 8.91566Z" fill={peer.color}/>
                <path d="M1.03418 2.48279V14.069L4.13763 11.069L4.55142 10.9655H9.51694L1.03418 2.48279Z" fill={peer.color}/>
            </svg>
        </div>
    )
}

interface RoomProps {
    peers: Map<number, PeerState>
}

function Room({peers}: RoomProps) {
    return (
        <div className="Room">
            {Array.from(peers.keys()).map((peerIdentifier) => {
                const peer = peers.get(peerIdentifier)
                if (!peer || peer.color === color) return false
                return <div className="Peer" key={peer.color} style={{backgroundColor: peer.color}}/>
            })}
        </div>
    )
}

interface BoxProps {
    peers: Map<number, PeerState>,
    selectingPeer: number | null
}

function Box({peers, selectingPeer}: BoxProps) {
    const boxRef = useRef() as MutableRefObject<HTMLDivElement>
    const [boxHeld, setBoxHeld] = useState(false)
    const [holdPosition, setHoldPosition] = useState({x: 0, y: 0})
    const [origin, setOrigin] = useState({x: 0, y: 0})
    const [selectionColor, setSelectionColor] = useState(`rgba(0, 0, 0, 0.0)`)

    useEffect(() => {
        // Sync Origin With Doc effect

        const docOrigin = doc.getMap('box').get('origin')
        setOrigin(docOrigin)

        doc.getMap('box').observe(() => {
            console.log('Document Updated')
            const docOrigin = doc.getMap('box').get('origin')
            setOrigin(docOrigin)
        })
    }, [])

    useEffect(() => {
        // Update Selection Color effect

        let color = `rgba(0, 0, 0, 0.0)`
        if (selectingPeer) {
            const selectingPeerState = peers.get(selectingPeer)
            if (selectingPeerState) color = selectingPeerState.color
        }
        setSelectionColor(color)
    }, [selectingPeer, peers])

    useLayoutEffect(() => {
        // Drag Box effect

        const setBoxHeldToTrue = (event: MouseEvent) => {
            setHoldPosition({
                x: event.clientX - origin.x,
                y: event.clientY - origin.y
            })
            setBoxHeld(true)
            provider.awareness.setLocalStateField('isSelecting', true)
        }

        const setBoxHeldToFalse = () => {
            setBoxHeld(false)
            provider.awareness.setLocalStateField('isSelecting', false)
        }

        const setBoxHeldToTrueWithTouch = (event: TouchEvent) => {
            const touch = event.touches.item(0)
            if (!touch) return

            setHoldPosition({
                x: touch.clientX - origin.x,
                y: touch.clientY - origin.y
            })
            setBoxHeld(true)
            provider.awareness.setLocalStateField('isSelecting', true)
        }

        const dragBox = (event: MouseEvent) => {
            if (boxHeld) {
                event.stopImmediatePropagation()
                event.preventDefault()

                const newOrigin = {
                    x: event.clientX - holdPosition.x,
                    y: event.clientY - holdPosition.y
                }
                doc.getMap('box').set('origin', newOrigin)
            }
        }

        const dragBoxWithTouch = (event: TouchEvent) => {
            const touch = event.touches.item(0)
            if (!touch) return

            if (boxHeld) {
                event.stopImmediatePropagation()
                event.preventDefault()

                const newOrigin = {
                    x: touch.clientX - holdPosition.x,
                    y: touch.clientY - holdPosition.y
                }
                doc.getMap('box').set('origin', newOrigin)
            }
        }

        const box = boxRef.current

        box.addEventListener('mousedown', setBoxHeldToTrue)
        window.addEventListener('mouseup', setBoxHeldToFalse)
        window.addEventListener('mousemove', dragBox)

        box.addEventListener('touchstart', setBoxHeldToTrueWithTouch)
        window.addEventListener('touchend', setBoxHeldToFalse)
        window.addEventListener('touchmove', dragBoxWithTouch)

        return () => {
            box.removeEventListener('mousedown', setBoxHeldToTrue)
            window.removeEventListener('mouseup', setBoxHeldToFalse)
            window.removeEventListener('mousemove', dragBox)

            box.removeEventListener('touchstart', setBoxHeldToTrueWithTouch)
            window.removeEventListener('touchend', setBoxHeldToFalse)
            window.removeEventListener('touchmove', dragBoxWithTouch)
        }
    })

    return <div className="Box" ref={boxRef} style={{
        transform: `translate(${origin.x}px, ${origin.y}px)`,
        borderColor: selectionColor
    }}/>
}

export default Canvas
