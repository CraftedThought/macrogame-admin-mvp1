// src/utils/notifications.ts

import toast from 'react-hot-toast';

// Default options for toasts to ensure consistency
const TOAST_OPTIONS = {
  duration: 4000, // 4 seconds
  position: 'bottom-center',
};

export const notifications = {
  /**
   * Displays a success notification. Appends "successfully!" to the message.
   * @param message The core message to display (e.g., "Campaign created").
   */
  success: (message: string) => {
    toast.success(`${message} successfully!`, TOAST_OPTIONS);
  },

  /**
   * Displays an error notification.
   * @param message The error message to display.
   */
  error: (message: string) => {
    // Errors are more critical, so we might give them a longer duration.
    toast.error(message, { ...TOAST_OPTIONS, duration: 5000 });
  },

  /**
   * Displays a loading notification.
   * @param message The message to display (e.g., "Duplicating...").
   * @returns The ID of the toast, to be used with `dismiss`.
   */
  loading: (message: string) => {
    return toast.loading(message, TOAST_OPTIONS);
  },

  /**
   * Dismisses a specific toast notification.
   * @param toastId The ID returned from the `loading` method.
   */
  dismiss: (toastId: string) => {
    toast.dismiss(toastId);
  },
};

