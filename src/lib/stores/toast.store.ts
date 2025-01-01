import { writable } from 'svelte/store';
import type { ToastMessage, ToastType } from '$lib/types/toast';

function createToastStore() {
    const { subscribe, update } = writable<ToastMessage[]>([]);

    return {
        subscribe,
        
        add: (message: string, type: ToastType = 'info', options: Partial<ToastMessage> = {}) => {
            const id = crypto.randomUUID();
            const toast: ToastMessage = {
                id,
                message,
                type,
                duration: 5000,
                dismissible: true,
                ...options,
                createdAt: Date.now()
            };

            update(toasts => [...toasts, toast]);

            if (toast.duration && toast.duration > 0) {
                setTimeout(() => {
                    update(toasts => toasts.filter(t => t.id !== id));
                }, toast.duration);
            }
        },

        remove: (id: string) => {
            update(toasts => toasts.filter(t => t.id !== id));
        },

        clear: () => {
            update(() => []);
        },

        success: (message: string, options: Partial<ToastMessage> = {}) => {
            toastStore.add(message, 'success', options);
        },

        error: (message: string, options: Partial<ToastMessage> = {}) => {
            toastStore.add(message, 'error', options);
        },

        warning: (message: string, options: Partial<ToastMessage> = {}) => {
            toastStore.add(message, 'warning', options);
        },

        info: (message: string, options: Partial<ToastMessage> = {}) => {
            toastStore.add(message, 'info', options);
        }
    };
}

export const toastStore = createToastStore(); 