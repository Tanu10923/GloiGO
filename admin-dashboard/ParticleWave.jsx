
import { useEffect, useRef } from 'react'

export default function ParticleWave() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animationFrame
    let width = 0
    let height = 0
    let time = 0

    const columns = 75
    const rows = 24

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      time += 0.012

      const points = []

      for (let row = 0; row <= rows; row++) {
        points[row] = []

        for (let col = 0; col <= columns; col++) {
          const x = (col / columns) * width
          const baseY = height * 0.52

          const wave1 = Math.sin(col * 0.12 + time) * 48
          const wave2 = Math.sin(col * 0.055 - time * 1.4 + row * 0.18) * 55
          const wave3 = Math.cos(col * 0.08 + time * 0.7) * 22

          const spread = (row - rows / 2) * 8
          const y = baseY + wave1 + wave2 + wave3 + spread

          points[row][col] = { x, y }
        }
      }

      // Connecting particle lines
      for (let row = 0; row <= rows; row++) {
        for (let col = 0; col <= columns; col++) {
          const p = points[row][col]

          ctx.beginPath()
          ctx.fillStyle = `rgba(137, 93, 255, ${0.15 + Math.random() * 0.22})`
          ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2)
          ctx.fill()

          if (col < columns) {
            const next = points[row][col + 1]
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(next.x, next.y)
            ctx.strokeStyle = 'rgba(139, 94, 255, 0.17)'
            ctx.lineWidth = 0.65
            ctx.stroke()
          }

          if (row < rows && col < columns) {
            const next = points[row + 1][col + 1]
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(next.x, next.y)
            ctx.strokeStyle = 'rgba(105, 83, 190, 0.10)'
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      // Glowing particles
      for (let i = 0; i < 28; i++) {
        const x = ((i * 173 + time * 15) % (width + 100)) - 50
        const y = height * 0.5 + Math.sin(i * 2 + time) * 150
        const radius = 2 + Math.sin(time * 2 + i) * 1.5

        ctx.beginPath()
        ctx.arc(x, y, Math.max(1, radius), 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(155, 110, 255, 0.22)'
        ctx.shadowBlur = 18
        ctx.shadowColor = '#8655ff'
        ctx.fill()
        ctx.shadowBlur = 0
      }

      animationFrame = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="particle-wave" />
}
