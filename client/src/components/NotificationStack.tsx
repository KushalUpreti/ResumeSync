import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCircleCheck,
  faCircleExclamation,
  faCircleInfo,
  faTriangleExclamation,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { useNotification } from '../context/useNotification'

const iconMap = {
  info: faCircleInfo,
  success: faCircleCheck,
  warning: faTriangleExclamation,
  error: faCircleExclamation,
}

export default function NotificationStack() {
  const { notifications, removeNotification } = useNotification()

  if (notifications.length === 0) return null

  return createPortal(
    <div className="notification-container">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification-toast notification-toast--${notification.type}`}
        >
          <div className="notification-toast__icon">
            <FontAwesomeIcon icon={iconMap[notification.type]} />
          </div>
          <div className="notification-toast__content">
            <h4 className="notification-toast__title">{notification.message}</h4>
            {notification.description && (
              <p className="notification-toast__description">{notification.description}</p>
            )}
          </div>
          <button
            className="notification-toast__close"
            onClick={() => removeNotification(notification.id)}
            type="button"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      ))}
    </div>,
    document.body
  )
}
