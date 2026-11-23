import { useEffect, useRef } from 'react'
import { makeScene, multiply, perspective, pose, type HologramScene } from './hologram-geometry'

const vertexShader = `
attribute vec3 a_position;
uniform mat4 u_model;
uniform mat4 u_camera;
varying float v_depth;
varying float v_height;
void main() {
  vec4 world = u_model * vec4(a_position, 1.0);
  vec4 clip = u_camera * world;
  v_depth = clamp((11.0 - clip.w) * 0.16 + 0.4, 0.18, 1.0);
  v_height = world.y;
  gl_Position = clip;
}`
const fragmentShader = `
precision mediump float;
uniform float u_alpha;
uniform float u_time;
varying float v_depth;
varying float v_height;
void main() {
  float sweep = exp(-pow((v_height - mod(u_time * 0.42, 5.5) + 2.75) * 8.0, 2.0));
  vec3 blue = mix(vec3(0.22, 0.62, 0.94), vec3(0.65, 0.9, 1.0), v_depth * 0.65 + sweep * 0.3);
  gl_FragColor = vec4(blue, u_alpha * v_depth * (0.82 + sweep * 0.18));
}`

/** Real perspective-projected geometry. No bitmap, model service or external engine. */
export function Hologram({ scene, className = '' }: { scene: HologramScene; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null),
    fallbackRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current!,
      fallback = fallbackRef.current!,
      host = canvas.parentElement!,
      parts = makeScene(scene)
    let gl: WebGLRenderingContext | null = null,
      resources: WebGLRenderingContext | null = null,
      program: WebGLProgram | null = null
    const shaders: WebGLShader[] = [],
      buffers: WebGLBuffer[] = []
    let two: CanvasRenderingContext2D | null = null,
      frame = 0,
      frames = 0,
      last = 0,
      visible = true,
      disposed = false
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    const origin = performance.now()
    let position = 0,
      model: WebGLUniformLocation | null = null,
      camera: WebGLUniformLocation | null = null,
      alpha: WebGLUniformLocation | null = null,
      clock: WebGLUniformLocation | null = null
    const enableFallbackRenderer = () => {
      gl = null
      canvas.hidden = true
      fallback.hidden = false
      two = fallback.getContext('2d')
      canvas.dataset.renderer = 'canvas-3d'
    }
    try {
      gl = canvas.getContext('webgl', {
        alpha: true,
        antialias: true,
        depth: false,
        premultipliedAlpha: false,
        powerPreference: 'low-power',
      })
      resources = gl
      if (!gl) enableFallbackRenderer()
      else {
        const compile = (type: number, source: string) => {
          const shader = gl!.createShader(type)!
          shaders.push(shader)
          gl!.shaderSource(shader, source)
          gl!.compileShader(shader)
          if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS))
            throw Error('Shader compilation unavailable')
          return shader
        }
        program = gl.createProgram()!
        gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexShader))
        gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentShader))
        gl.linkProgram(program)
        if (!gl.getProgramParameter(program, gl.LINK_STATUS))
          throw Error('Shader linking unavailable')
        gl.useProgram(program)
        position = gl.getAttribLocation(program, 'a_position')
        model = gl.getUniformLocation(program, 'u_model')
        camera = gl.getUniformLocation(program, 'u_camera')
        alpha = gl.getUniformLocation(program, 'u_alpha')
        clock = gl.getUniformLocation(program, 'u_time')
        gl.enableVertexAttribArray(position)
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
        gl.clearColor(0, 0, 0, 0)
        for (const part of parts) {
          const buffer = gl.createBuffer()!
          buffers.push(buffer)
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
          gl.bufferData(gl.ARRAY_BUFFER, part.vertices, gl.STATIC_DRAW)
        }
        canvas.dataset.renderer = 'webgl'
      }
    } catch {
      enableFallbackRenderer()
    }
    const render = (now: number) => {
      frame = 0
      if (disposed || !visible || document.hidden) return
      const fps = scene === 'machinery' || two ? 30 : 60
      if (now - last < 1000 / fps && !motion.matches) {
        frame = requestAnimationFrame(render)
        return
      }
      last = now
      const t = motion.matches ? 4 : (now - origin) / 1000
      const width = host.clientWidth,
        height = host.clientHeight
      if (!width || !height) return
      const dpr = Math.min(devicePixelRatio || 1, scene === 'machinery' ? 1.25 : 1.75)
      const active = gl ? canvas : fallback
      if (active.width !== Math.round(width * dpr) || active.height !== Math.round(height * dpr)) {
        active.width = Math.round(width * dpr)
        active.height = Math.round(height * dpr)
      }
      const view = perspective(width / height, scene === 'meridian' ? 5.8 : width < 600 ? 14.8 : 11)
      const root =
        scene === 'meridian'
          ? pose([0, 0.21, 0], [-0.14, 0.35 + t * 0.23, -0.08])
          : pose([0.45, -0.05, 0], [-0.32, 0.35 + t * 0.09, -0.25])
      if (gl) {
        gl.viewport(0, 0, active.width, active.height)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.uniformMatrix4fv(camera, false, view)
        gl.uniform1f(clock, t)
      }
      if (two) {
        two.setTransform(dpr, 0, 0, dpr, 0, 0)
        two.clearRect(0, 0, width, height)
        two.globalCompositeOperation = 'lighter'
        two.strokeStyle = '#69c5ff'
        two.lineWidth = scene === 'machinery' ? 0.75 : 1.05
      }
      parts.forEach((part, i) => {
        const world = multiply(root, pose(part.position, part.rotation, part.scale))
        const rotating = multiply(world, pose([0, 0, 0], [0, 0, part.spin * t]))
        if (gl) {
          gl.uniformMatrix4fv(model, false, rotating)
          gl.uniform1f(alpha, part.alpha)
          gl.bindBuffer(gl.ARRAY_BUFFER, buffers[i])
          gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0)
          gl.drawArrays(gl.LINES, 0, part.vertices.length / 3)
        } else if (two) {
          const m = multiply(view, rotating),
            v = part.vertices
          two.globalAlpha = part.alpha * 0.8
          two.beginPath()
          for (let j = 0; j < v.length; j += 3) {
            const x = v[j],
              y = v[j + 1],
              z = v[j + 2],
              w = m[3] * x + m[7] * y + m[11] * z + m[15]
            const px = (((m[0] * x + m[4] * y + m[8] * z + m[12]) / w + 1) * width) / 2
            const py = ((1 - (m[1] * x + m[5] * y + m[9] * z + m[13]) / w) * height) / 2
            if ((j / 3) % 2 === 0) two.moveTo(px, py)
            else two.lineTo(px, py)
          }
          two.stroke()
        }
      })
      canvas.dataset.frame = String(++frames)
      if (!motion.matches) frame = requestAnimationFrame(render)
    }
    const resume = () => {
      if (!frame && !disposed) frame = requestAnimationFrame(render)
    }
    const observer = new ResizeObserver(resume)
    observer.observe(host)
    const intersection = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting
      if (visible) resume()
      else {
        cancelAnimationFrame(frame)
        frame = 0
      }
    })
    intersection.observe(host)
    const visibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame)
        frame = 0
      } else resume()
    }
    const contextLost = (event: Event) => {
      event.preventDefault()
      enableFallbackRenderer()
      resume()
    }
    canvas.addEventListener('webglcontextlost', contextLost)
    document.addEventListener('visibilitychange', visibility)
    motion.addEventListener('change', resume)
    resume()
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      intersection.disconnect()
      canvas.removeEventListener('webglcontextlost', contextLost)
      document.removeEventListener('visibilitychange', visibility)
      motion.removeEventListener('change', resume)
      if (resources) {
        buffers.forEach((b) => resources!.deleteBuffer(b))
        shaders.forEach((s) => resources!.deleteShader(s))
        if (program) resources.deleteProgram(program)
        resources.getExtension('WEBGL_lose_context')?.loseContext()
      }
    }
  }, [scene])
  return (
    <div
      className={'hologram hologram-' + scene + ' ' + className}
      role={scene === 'meridian' ? 'img' : undefined}
      aria-label={
        scene === 'meridian'
          ? 'A rotating three-dimensional hologram of the Glass Meridian astronomical instrument'
          : undefined
      }
      aria-hidden={scene === 'machinery' ? true : undefined}
    >
      <canvas ref={ref} data-scene={scene} />
      <canvas ref={fallbackRef} className="hologram-fallback" hidden />
    </div>
  )
}
