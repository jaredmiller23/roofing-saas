'use client'

// =============================================
// Call Recording Audio Player Component
// =============================================
// Component: AudioPlayer
// Purpose: Play call recordings with full controls
// Author: Claude Code
// Date: 2025-11-18
// =============================================

import { useEffect, useRef, useState } from 'react'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Download,
} from 'lucide-react'

interface AudioPlayerProps {
  /**
   * URL of the audio recording (Twilio recording URL)
   */
  recordingUrl: string

  /**
   * Duration of the recording in seconds (from database)
   * Used for initial display before audio metadata loads
   */
  duration?: number | null

  /**
   * Optional class name for styling
   */
  className?: string
}

/**
 * Audio Player Component
 *
 * Features:
 * - Play/Pause control
 * - Seekable progress bar
 * - Current time / Total duration display
 * - Playback speed controls (0.5x, 1x, 1.5x, 2x)
 * - Volume control with mute
 * - Download button
 * - Skip forward/backward 15 seconds
 */
export function AudioPlayer({ recordingUrl, duration, className = '' }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(duration || 0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isLoading, setIsLoading] = useState(true)

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Toggle play/pause
  const togglePlayPause = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  // Seek to specific time
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return

    const newTime = parseFloat(e.target.value)
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  // Skip forward/backward 15 seconds
  const skip = (seconds: number) => {
    if (!audioRef.current) return

    const newTime = Math.max(0, Math.min(audioRef.current.currentTime + seconds, totalDuration))
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  // Change playback speed
  const changePlaybackRate = (rate: number) => {
    if (!audioRef.current) return

    audioRef.current.playbackRate = rate
    setPlaybackRate(rate)
  }

  // Toggle mute
  const toggleMute = () => {
    if (!audioRef.current) return

    audioRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  // Change volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return

    const newVolume = parseFloat(e.target.value)
    audioRef.current.volume = newVolume
    setVolume(newVolume)

    if (newVolume === 0) {
      setIsMuted(true)
    } else if (isMuted) {
      setIsMuted(false)
    }
  }

  // Download recording
  const handleDownload = async () => {
    try {
      const response = await fetch(recordingUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `call-recording-${Date.now()}.mp3`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading recording:', error)
      alert('Failed to download recording. Please try again.')
    }
  }

  // Setup audio event listeners
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => {
      setTotalDuration(audio.duration)
      setIsLoading(false)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    const handleError = () => {
      setIsLoading(false)
      console.error('Error loading audio')
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
    }
  }, [])

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {/* Hidden audio element */}
      <audio ref={audioRef} src={recordingUrl} preload="metadata" />

      {/* Player Controls */}
      <div className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max={totalDuration}
            value={currentTime}
            onChange={handleSeek}
            disabled={isLoading}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(to right, #2563eb 0%, #2563eb ${
                (currentTime / totalDuration) * 100
              }%, #e5e7eb ${(currentTime / totalDuration) * 100}%, #e5e7eb 100%)`,
            }}
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>

        {/* Main Controls Row */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Skip Back + Play/Pause + Skip Forward */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => skip(-15)}
              disabled={isLoading}
              className="p-2 rounded-lg hover:bg-gray-100 text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Skip back 15 seconds"
            >
              <SkipBack className="h-5 w-5" />
            </button>

            <button
              onClick={togglePlayPause}
              disabled={isLoading}
              className="p-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
            </button>

            <button
              onClick={() => skip(15)}
              disabled={isLoading}
              className="p-2 rounded-lg hover:bg-gray-100 text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Skip forward 15 seconds"
            >
              <SkipForward className="h-5 w-5" />
            </button>
          </div>

          {/* Center: Playback Speed */}
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground mr-2">Speed:</span>
            {[0.5, 1, 1.5, 2].map((rate) => (
              <button
                key={rate}
                onClick={() => changePlaybackRate(rate)}
                disabled={isLoading}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  playbackRate === rate
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-muted-foreground hover:bg-muted'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Right: Volume + Download */}
          <div className="flex items-center gap-3">
            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                disabled={isLoading}
                className="p-2 rounded-lg hover:bg-gray-100 text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                disabled={isLoading}
                className="w-20 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={isLoading}
              className="p-2 rounded-lg hover:bg-gray-100 text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Download recording"
            >
              <Download className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center text-sm text-muted-foreground">Loading recording...</div>
        )}
      </div>
    </div>
  )
}
