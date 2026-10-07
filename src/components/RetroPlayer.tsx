import { useRef, useState, useEffect } from "react"
import { Play, Pause, Music } from "lucide-react"

interface RetroPlayerProps {
  url: string
  title?: string | null
}

/** 無名小站魂：復古卡帶音樂盒。音源由主人自己在個人資料貼網址。 */
const RetroPlayer = ({ url, title }: RetroPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [broken, setBroken] = useState(false)

  useEffect(() => {
    // 換頁卸載時停掉
    return () => {
      audioRef.current?.pause()
    }
  }, [])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio || broken) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => setBroken(true))
    }
  }

  const songName = title?.trim() || "主人的私藏歌單"

  return (
    <div className="bg-neutral-950 border border-neutral-700 rounded-xl p-4 text-lime-400 select-none">
      <style>{`
        @keyframes hb-reel { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes hb-marquee-x { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
      `}</style>
      <p className="text-xs font-mono mb-3 text-lime-500/80">♪ MUSIC BOX</p>

      {/* 卡帶 */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-3">
        <div className="flex items-center justify-between gap-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="w-9 h-9 rounded-full border-2 border-lime-500/50 flex items-center justify-center shrink-0"
              style={playing ? { animation: "hb-reel 2.2s linear infinite" } : undefined}
            >
              <div className="w-3.5 h-3.5 rounded-full border border-lime-500/60" />
              <div className="absolute w-9 h-0.5 bg-lime-500/30" />
            </div>
          ))}
          <div className="flex-1 overflow-hidden border-y border-neutral-700 py-1 mx-1">
            {playing ? (
              <p
                className="font-mono text-xs whitespace-nowrap w-max"
                style={{ animation: "hb-marquee-x 9s linear infinite" }}
              >
                ♪ {songName} ♪
              </p>
            ) : (
              <p className="font-mono text-xs truncate text-center text-lime-500/70">{songName}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 mt-3">
        <button
          onClick={toggle}
          className="w-11 h-11 rounded-full border border-lime-500/60 flex items-center justify-center hover:bg-lime-500/10 transition-colors"
          aria-label={playing ? "暫停" : "播放"}
        >
          {broken ? <Music className="w-5 h-5 opacity-50" /> : playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>
      </div>
      <p className="text-center text-[10px] font-mono text-lime-500/50 mt-2">
        {broken ? "音源讀不到，請主人檢查網址" : playing ? "NOW PLAYING" : "PRESS PLAY"}
      </p>

      <audio ref={audioRef} src={url} loop preload="none" onError={() => setBroken(true)} onEnded={() => setPlaying(false)} />
    </div>
  )
}

export default RetroPlayer
