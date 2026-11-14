
import { motion } from 'framer-motion'

export default function VanMotion() {
  return (
    <motion.div
      className="van-motion"
      initial={{ x: '-35vw' }}
      animate={{ x: '110vw' }}
      transition={{
        duration: 22,
        repeat: Infinity,
        ease: 'linear',
        repeatDelay: 0,
      }}
    >
      <svg viewBox="0 0 420 230" width="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="vanBody" x1="0" y1="0" x2="0.8" y2="1">
            <stop offset="0" stopColor="#fff" />
            <stop offset=".55" stopColor="#d9dce9" />
            <stop offset="1" stopColor="#777b91" />
          </linearGradient>
          <linearGradient id="vanGlass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8d9fc9" />
            <stop offset="1" stopColor="#111629" />
          </linearGradient>
        </defs>

        <ellipse cx="210" cy="198" rx="155" ry="12" fill="#853cff" opacity=".3" />

        <path d="M55 91 Q62 54 110 47 L275 43 Q306 43 328 76 L371 126 L377 170 Q376 184 357 188 L54 188 Q39 182 42 160 Z"
          fill="url(#vanBody)" stroke="#b9b5d0" strokeWidth="2" />

        <path d="M276 54 Q306 54 322 82 L344 120 L280 116 Z"
          fill="url(#vanGlass)" stroke="#c4c8dc" strokeWidth="3" />

        <path d="M111 59 L184 57 L184 115 L99 115 Z"
          fill="url(#vanGlass)" stroke="#f5f2ff" strokeWidth="3" />

        <path d="M195 57 L267 55 L270 115 L195 115 Z"
          fill="url(#vanGlass)" stroke="#f5f2ff" strokeWidth="3" />

        <path d="M65 121 L270 121 L270 173 L59 173 Z" fill="#f9f9ff" />

        <text x="166" y="148" textAnchor="middle"
          fontSize="25" fontWeight="bold" fill="#6734cf">GloiGO</text>
        <text x="166" y="162" textAnchor="middle"
          fontSize="7" letterSpacing="2" fill="#55516a">CARE IN MOTION</text>

        <path d="M344 132 L371 137 L370 168 L349 171 Z" fill="#34384b" />
        <path d="M351 144 L370 146 L369 151 L351 150 Z" fill="#aab0c5" />
        <path d="M340 122 L365 129 L369 139 L346 134 Z" fill="#fff3bf" />

        {[104, 310].map(x => (
          <g key={x}>
            <circle cx={x} cy="181" r="27" fill="#11121b" />
            <circle cx={x} cy="181" r="17" fill="#777d91" />
            <circle cx={x} cy="181" r="9" fill="#25283a" />
            <circle cx={x} cy="181" r="4" fill="#c8cce0" />
          </g>
        ))}

        <path d="M190 119 L190 174 M275 118 L275 174"
          stroke="#9b9bae" strokeWidth="2" />
      </svg>
    </motion.div>
  )
}
