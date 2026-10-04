export const notificationService = {
  isSupported() {
    return 'Notification' in window;
  },

  getPermission() {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  },

  async requestPermission() {
    if (!this.isSupported()) return 'denied';
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.setNotificationsEnabled(true);
      } else {
        this.setNotificationsEnabled(false);
      }
      return permission;
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      return 'denied';
    }
  },

  isNotificationsEnabled() {
    return localStorage.getItem('bt_notifications_enabled') === 'true';
  },

  setNotificationsEnabled(enabled) {
    localStorage.setItem('bt_notifications_enabled', enabled ? 'true' : 'false');
  },

  async checkAndSendNotifications(reminders, currentVehicleOdo) {
    if (!this.isSupported() || this.getPermission() !== 'granted' || !this.isNotificationsEnabled()) {
      return;
    }

    if (!reminders || !Array.isArray(reminders)) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const remindBeforeDays = 3;

    for (const rem of reminders) {
      if (rem.status === 'completed' || rem.status === 'dismissed') continue;

      let shouldNotify = false;
      let condition = '';
      let message = '';

      if (rem.due_odometer_km && currentVehicleOdo) {
        if (parseFloat(currentVehicleOdo) >= parseFloat(rem.due_odometer_km)) {
          shouldNotify = true;
          condition = 'odo_due';
          message = `Odometer threshold reached (${rem.due_odometer_km} km) for ${rem.title}.`;
        }
      }

      if (!shouldNotify && rem.due_date) {
        const dueDate = new Date(rem.due_date);
        dueDate.setHours(0, 0, 0, 0);
        
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          shouldNotify = true;
          condition = 'date_overdue';
          message = `${rem.title} is overdue by ${Math.abs(diffDays)} days.`;
        } else if (diffDays === 0) {
          shouldNotify = true;
          condition = 'date_today';
          message = `${rem.title} is due today.`;
        } else if (diffDays <= remindBeforeDays) {
          shouldNotify = true;
          condition = `date_upcoming_${diffDays}`;
          message = `${rem.title} is upcoming in ${diffDays} days.`;
        }
      }

      if (shouldNotify) {
        const notifKey = `reminder_notification_${rem.id}_${condition}`;
        const alreadyNotified = localStorage.getItem(notifKey);

        if (!alreadyNotified) {
          this.sendSystemNotification('Tracker Reminder: ' + rem.title, {
            body: message,
            icon: '/icon-192x192.png',
            tag: notifKey,
          });
          localStorage.setItem(notifKey, 'true');
        }
      }
    }
  },

  sendSystemNotification(title, options) {
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, options).catch(() => {
            this.fallbackNotification(title, options);
          });
        }).catch(() => {
          this.fallbackNotification(title, options);
        });
      } else {
        this.fallbackNotification(title, options);
      }
    } catch {
      this.fallbackNotification(title, options);
    }
  },

  fallbackNotification(title, options) {
    try {
      const notification = new Notification(title, options);
      notification.onclick = function() {
        window.focus();
        notification.close();
      };
    } catch (err) {
      console.error('Failed to show notification:', err);
    }
  }
};
