export default function beep({ duration = 500, frequency = 800 }) {
  const context = new AudioContext()
  const oscillator = context.createOscillator()
  oscillator.type = "sine"
  oscillator.frequency.value = frequency
  oscillator.connect(context.destination)
  oscillator.start()

  setTimeout(function () {
    oscillator.stop()
  }, duration)
}
