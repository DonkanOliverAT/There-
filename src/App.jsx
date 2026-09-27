import { useEffect, useRef, useState } from 'react'
import { FilesetResolver, HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision'
import {
  FiCamera,
  FiCameraOff,
  FiChevronLeft,
  FiChevronRight,
  FiFolder,
  FiList,
  FiTrash2,
  FiArrowUp,
  FiArrowDown,
} from 'react-icons/fi'
import './App.css'
import { detectStopGesture } from './handDetection'

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

function App() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const streamRef = useRef(null)
  const handLandmarkerRef = useRef(null)
  const cameraOnRef = useRef(false)
  const fileInputRef = useRef(null)
  const mediaVideoRef = useRef(null)

  const [cameraOn, setCameraOn] = useState(false)
  const [status, setStatus] = useState('Cámara apagada')
  const [action, setAction] = useState('Esperando.')
  const [mediaItems, setMediaItems] = useState([])
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [showMediaList, setShowMediaList] = useState(false)

  const currentMediaItem = mediaItems[currentMediaIndex] ?? null
  const currentMediaUrl = currentMediaItem?.url ?? ''
  const currentMediaType = currentMediaItem?.type ?? ''
  const currentMediaCount = mediaItems.length
  const currentMediaPosition = currentMediaCount > 0 ? currentMediaIndex + 1 : 0
  const currentMediaLabel = currentMediaItem?.name ? `${currentMediaPosition}/${currentMediaCount}: ${currentMediaItem.name}` : `Archivo ${currentMediaPosition}/${currentMediaCount}`

  useEffect(() => {
    if (currentMediaIndex >= mediaItems.length) {
      setCurrentMediaIndex(Math.max(mediaItems.length - 1, 0))
    }
  }, [currentMediaIndex, mediaItems.length])

  useEffect(() => {
    return () => {
      stopCamera()
      mediaItems.forEach((item) => URL.revokeObjectURL(item.url))
    }
  }, [])

  useEffect(() => {
    const videoElement = mediaVideoRef.current
    if (!videoElement || currentMediaType !== 'video') return

    if (action === 'Señal stop') {
      videoElement.pause()
      return
    }

    if (videoElement.readyState >= 2) {
      videoElement.play().catch(() => {})
    }
  }, [action, currentMediaType, currentMediaUrl])

  async function initializeHandLandmarker() {
    if (handLandmarkerRef.current) return

    const vision = await FilesetResolver.forVisionTasks('/wasm')

    handLandmarkerRef.current = {
      instance: await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: 'VIDEO',
        numHands: 2,
      }),
      DrawingUtils,
    }
  }

  async function startCamera() {
    try {
      await initializeHandLandmarker()

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })

      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()

      cameraOnRef.current = true
      setCameraOn(true)
      setStatus('Cámara activa')
      setAction('Ninguna')

      const renderFrame = () => {
        if (!videoRef.current || !handLandmarkerRef.current || !cameraOnRef.current) {
          animationRef.current = requestAnimationFrame(renderFrame)
          return
        }

        const { instance, DrawingUtils } = handLandmarkerRef.current
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        const video = videoRef.current

        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 480

        const result = instance.detectForVideo(video, performance.now())

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        let detectedStop = false

        if (result.landmarks && result.landmarks.length > 0) {
          const drawingUtils = new DrawingUtils(ctx)

          result.landmarks.forEach((landmarks) => {
            drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
              color: '#22c55e',
              lineWidth: 3,
            })
            drawingUtils.drawLandmarks(landmarks, {
              color: '#f8fafc',
              lineWidth: 2,
              radius: 4,
            })

            if (detectStopGesture(landmarks)) {
              detectedStop = true
            }
          })
        }

        setAction(detectedStop ? 'Señal stop' : 'Ninguna')
        animationRef.current = requestAnimationFrame(renderFrame)
      }

      animationRef.current = requestAnimationFrame(renderFrame)
    } catch (error) {
      console.error(error)
      setStatus('No se pudo acceder a la cámara')
      setAction('Error de permiso')
      alert('Necesitas permitir el acceso a la cámara para usar esta demo.')
    }
  }

  function stopCamera() {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    cameraOnRef.current = false
    setCameraOn(false)
    setStatus('Cámara apagada')
    setAction('Esperando.')
  }

  async function toggleCamera() {
    if (cameraOn) {
      stopCamera()
      return
    }

    await startCamera()
  }

  function handleMediaSelect(event) {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return

    const nextItems = files.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(16).slice(2)}`,
      name: file.name,
      type: file.type.startsWith('video/') ? 'video' : 'image',
      url: URL.createObjectURL(file),
    }))

    const nextStartIndex = mediaItems.length
    setMediaItems((previous) => [...previous, ...nextItems])
    setCurrentMediaIndex(nextStartIndex)
    event.target.value = ''
  }

  function openMediaPicker() {
    fileInputRef.current?.click()
  }

  function goToMedia(direction) {
    if (mediaItems.length === 0) return

    setCurrentMediaIndex((current) => (current + direction + mediaItems.length) % mediaItems.length)
  }

  function removeMediaItem(itemId) {
    setMediaItems((previous) => {
      const indexToRemove = previous.findIndex((item) => item.id === itemId)
      if (indexToRemove === -1) return previous

      const [removedItem] = previous.splice(indexToRemove, 1)
      if (removedItem?.url) {
        URL.revokeObjectURL(removedItem.url)
      }

      const next = [...previous]
      setCurrentMediaIndex((current) => {
        if (next.length === 0) return 0

        const safeCurrent = Math.min(current, next.length - 1)
        if (indexToRemove <= current) {
          return Math.max(safeCurrent, 0)
        }
        return safeCurrent
      })

      return next
    })
  }

  function moveMediaItem(itemId, direction) {
    setMediaItems((previous) => {
      const selectedIndex = previous.findIndex((item) => item.id === itemId)
      const targetIndex = selectedIndex + direction

      if (selectedIndex < 0 || targetIndex < 0 || targetIndex >= previous.length) {
        return previous
      }

      const reordered = [...previous]
      const [movedItem] = reordered.splice(selectedIndex, 1)
      reordered.splice(targetIndex, 0, movedItem)

      setCurrentMediaIndex(reordered.findIndex((item) => item.id === currentMediaItem?.id))
      return reordered
    })
  }

  return (
    <main className="app-shell">
      <aside className="panel">
        <h1>There!</h1>
        <p className="subtitle">active la camara para operar</p>

        <div className="toolbar">
          <button
            type="button"
            className="icon-btn camera-toggle"
            onClick={toggleCamera}
            aria-label={cameraOn ? 'Apagar cámara' : 'Encender cámara'}
            title={cameraOn ? 'Apagar cámara' : 'Encender cámara'}
          >
            {cameraOn ? <FiCameraOff size={20} /> : <FiCamera size={20} />}
          </button>

          <button
            type="button"
            className="icon-btn media-btn"
            onClick={openMediaPicker}
            aria-label="Cargar archivo multimedia"
            title="Cargar archivo multimedia"
          >
            <FiFolder size={20} />
          </button>

          <button
            type="button"
            className="icon-btn list-btn"
            onClick={() => setShowMediaList((open) => !open)}
            aria-label="Gestionar archivos cargados"
            title="Gestionar archivos cargados"
          >
            <FiList size={20} />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            hidden
            multiple
            onChange={handleMediaSelect}
          />
        </div>

        {showMediaList && (
          <div className="media-list-popover">
            <div className="media-list-header">
              <strong>Archivos cargados</strong>
              <button type="button" className="ghost-btn" onClick={() => setShowMediaList(false)}>
                Cerrar
              </button>
            </div>

            {mediaItems.length === 0 ? (
              <p className="media-list-empty">No hay archivos cargados.</p>
            ) : (
              <ul className="media-list">
                {mediaItems.map((item, index) => (
                  <li
                    key={item.id}
                    className={currentMediaItem?.id === item.id ? 'active' : ''}
                    onClick={() => {
                      setCurrentMediaIndex(index)
                      setShowMediaList(false)
                    }}
                  >
                    <div className="media-item-meta">
                      <span className="media-item-name">{item.name}</span>
                      <span className="media-item-type">{item.type === 'video' ? 'Video' : 'Imagen'}</span>
                    </div>

                    <div className="media-item-actions">
                      <button
                        type="button"
                        className="mini-action"
                        onClick={(event) => {
                          event.stopPropagation()
                          moveMediaItem(item.id, -1)
                        }}
                        aria-label="Mover arriba"
                        disabled={index === 0}
                      >
                        <FiArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        className="mini-action"
                        onClick={(event) => {
                          event.stopPropagation()
                          moveMediaItem(item.id, 1)
                        }}
                        aria-label="Mover abajo"
                        disabled={index === mediaItems.length - 1}
                      >
                        <FiArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        className="mini-action danger"
                        onClick={(event) => {
                          event.stopPropagation()
                          removeMediaItem(item.id)
                        }}
                        aria-label="Eliminar archivo"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="camera-panel">
          <video ref={videoRef} autoPlay muted playsInline />
          <canvas ref={canvasRef} />
        </div>

        <div className="status-box">
          <span>Estado:</span>
          <strong>{status}</strong>
        </div>

        <div className="status-box accent">
          <span>Acción:</span>
          <strong>{action}</strong>
        </div>
      </aside>

      <section className="media-stage">
        {mediaItems.length > 0 ? (
          <>
            <div className="media-counter">
              {currentMediaLabel}
            </div>

            {mediaItems.length > 1 && (
              <>
                <button
                  type="button"
                  className="media-arrow left"
                  onClick={() => goToMedia(-1)}
                  aria-label="Anterior archivo"
                >
                  <FiChevronLeft size={26} />
                </button>
                <button
                  type="button"
                  className="media-arrow right"
                  onClick={() => goToMedia(1)}
                  aria-label="Siguiente archivo"
                >
                  <FiChevronRight size={26} />
                </button>
              </>
            )}

            {currentMediaType === 'video' ? (
              <video
                key={currentMediaUrl}
                ref={mediaVideoRef}
                src={currentMediaUrl}
                controls
                autoPlay
                loop={false}
                playsInline
                className="loaded-media"
              />
            ) : (
              <img
                key={currentMediaUrl}
                src={currentMediaUrl}
                alt="Archivo cargado"
                className="loaded-media"
              />
            )}
          </>
        ) : (
          <div className="empty-media">
            <FiFolder size={54} />
            <p>Carga una imagen o video para mostrarlo en grande.</p>
          </div>
        )}
      </section>
    </main>
  )
}

export default App
