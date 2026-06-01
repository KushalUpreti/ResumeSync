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

import { useState } from 'react'
export default function NotificationStack() {
  const { notifications, removeNotification } = useNotification()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

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
              {notification.description && (() => {
                const maxLen = 200
                const isLong = notification.description.length > maxLen
                const isExpanded = expandedIds.has(notification.id)
                const displayText = isLong && !isExpanded
                  ? `${notification.description.slice(0, maxLen)}…`
                  : notification.description
                return (
                  <>
                    <p className="notification-toast__description">{displayText}</p>
                    {isLong && (
                      <button
                        className="notification-toast__toggle"
                        onClick={() => {
                          const newSet = new Set(expandedIds)
                          if (isExpanded) newSet.delete(notification.id)
                          else newSet.add(notification.id)
                          setExpandedIds(newSet)
                        }}
                        type="button"
                      >
                        {isExpanded ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </>
                )
              })()}
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
