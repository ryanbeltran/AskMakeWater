/**
 * Floating geometric shapes inspired by makewater.org's design.
 * Wireframe triangular meshes, wireframe cubes, and filled accent circles.
 * Renders as a fixed background layer behind all content.
 */
export default function GeometricBackground() {
  return (
    <div className="geometric-bg" aria-hidden="true">
      {/* Top-left: wireframe triangular mesh */}
      <svg
        className="geo-shape geo-float-slow"
        style={{ top: '-4%', left: '-6%', width: '340px', height: '300px' }}
        viewBox="0 0 340 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polygon points="40,20 170,10 130,90" stroke="currentColor" strokeWidth="0.8" />
        <polygon points="170,10 290,30 220,100" stroke="currentColor" strokeWidth="0.8" />
        <polygon points="130,90 220,100 170,10" stroke="currentColor" strokeWidth="0.8" />
        <polygon points="40,20 130,90 20,140" stroke="currentColor" strokeWidth="0.8" />
        <polygon points="130,90 100,190 20,140" stroke="currentColor" strokeWidth="0.8" />
        <polygon points="130,90 220,100 180,180" stroke="currentColor" strokeWidth="0.8" />
        <polygon points="220,100 290,30 310,130" stroke="currentColor" strokeWidth="0.8" />
        <polygon points="220,100 310,130 260,200" stroke="currentColor" strokeWidth="0.8" />
        <polygon points="180,180 260,200 220,100" stroke="currentColor" strokeWidth="0.8" />
        <polygon points="100,190 180,180 150,270" stroke="currentColor" strokeWidth="0.8" />
        <polygon points="180,180 260,200 210,280" stroke="currentColor" strokeWidth="0.8" />
        <polygon points="150,270 210,280 180,180" stroke="currentColor" strokeWidth="0.8" />
      </svg>

      {/* Top-right: large red circle, cut off by top and right edges */}
      <div
        className="geo-shape geo-float-slow"
        style={{
          top: '-180px',
          right: '-180px',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'var(--color-mw-human)',
          opacity: 0.06,
        }}
      />

      {/* Middle-left: filled accent circle (water blue) */}
      <div
        className="geo-shape geo-float-slow"
        style={{
          top: '38%',
          left: '-3%',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'var(--color-mw-water)',
          opacity: 0.06,
        }}
      />

      {/* Middle-right: small triangular mesh */}
      <svg
        className="geo-shape geo-float-fast"
        style={{ top: '45%', right: '-2%', width: '180px', height: '160px' }}
        viewBox="0 0 180 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polygon points="20,30 90,10 70,70" stroke="currentColor" strokeWidth="0.7" />
        <polygon points="90,10 160,25 120,80" stroke="currentColor" strokeWidth="0.7" />
        <polygon points="70,70 120,80 90,10" stroke="currentColor" strokeWidth="0.7" />
        <polygon points="20,30 70,70 30,120" stroke="currentColor" strokeWidth="0.7" />
        <polygon points="70,70 120,80 100,140" stroke="currentColor" strokeWidth="0.7" />
        <polygon points="30,120 100,140 70,70" stroke="currentColor" strokeWidth="0.7" />
      </svg>

      {/* Bottom-left: wireframe cube */}
      <svg
        className="geo-shape geo-float-med"
        style={{ bottom: '8%', left: '-5%', width: '200px', height: '200px' }}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M20,50 L110,25 L160,65 L70,90 Z" stroke="currentColor" strokeWidth="0.8" />
        <path d="M20,50 L20,140 L70,180 L70,90 Z" stroke="currentColor" strokeWidth="0.8" />
        <path d="M70,90 L70,180 L160,155 L160,65 Z" stroke="currentColor" strokeWidth="0.8" />
      </svg>

      {/* Bottom-right: filled accent circle (solar yellow) */}
      <div
        className="geo-shape geo-float-fast"
        style={{
          bottom: '5%',
          right: '-2%',
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          background: 'var(--color-mw-solar)',
          opacity: 0.07,
        }}
      />

      {/* Bottom-center: small wireframe triangles */}
      <svg
        className="geo-shape geo-float-slow"
        style={{ bottom: '-2%', left: '30%', width: '220px', height: '140px' }}
        viewBox="0 0 220 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polygon points="30,20 110,5 80,60" stroke="currentColor" strokeWidth="0.7" />
        <polygon points="110,5 190,20 150,70" stroke="currentColor" strokeWidth="0.7" />
        <polygon points="80,60 150,70 110,5" stroke="currentColor" strokeWidth="0.7" />
        <polygon points="80,60 150,70 120,130" stroke="currentColor" strokeWidth="0.7" />
      </svg>

      {/* Extra: small blue circle accent near top-center */}
      <div
        className="geo-shape geo-float-fast"
        style={{
          top: '12%',
          left: '55%',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'var(--color-mw-water)',
          opacity: 0.05,
        }}
      />
    </div>
  );
}
