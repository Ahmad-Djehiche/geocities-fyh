import { useEffect, useRef } from 'react'

export default function Dialog({ children, className, labelId, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  function handleCancel(event) {
    event.preventDefault()
    onClose()
  }

  function handleClick(event) {
    if (event.target !== event.currentTarget) return
    const { left, top, right, bottom } = event.currentTarget.getBoundingClientRect()
    const { clientX, clientY } = event
    if (clientX < left || clientX > right || clientY < top || clientY > bottom) onClose()
  }

  return (
    <dialog ref={ref} className={className} aria-labelledby={labelId} onCancel={handleCancel} onClick={handleClick}>
      {children}
    </dialog>
  )
}
