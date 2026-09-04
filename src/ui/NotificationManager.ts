export type NotificationType = 'info' | 'success' | 'error' | 'log';

export interface NotificationAction {
    label: string;
    onClick: () => void;
}

export interface NotificationOptions {
    title?: string;
    message: string;
    type?: NotificationType;
    duration?: number; // 0 for infinite
    actions?: NotificationAction[];
}

class NotificationManager {
    private container: HTMLElement;

    constructor() {
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        
        // Wait for body to be available
        if (document.body) {
            document.body.appendChild(this.container);
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                document.body.appendChild(this.container);
            });
        }
        
        // Global error capture
        window.addEventListener('error', (e) => {
            this.show({ type: 'error', title: 'Błąd (Exception)', message: e.message });
        });
        
        window.addEventListener('unhandledrejection', (e) => {
            this.show({ type: 'error', title: 'Błąd (Promise Rejection)', message: String(e.reason) });
        });

        // Capture console errors and warnings
        const origError = console.error;
        console.error = (...args) => {
            origError.apply(console, args);
            this.show({ type: 'error', title: 'Błąd (Console)', message: args.join(' ') });
        };

        const origWarn = console.warn;
        console.warn = (...args) => {
            origWarn.apply(console, args);
            this.show({ type: 'info', title: 'Ostrzeżenie', message: args.join(' ') });
        };
    }

    show(options: NotificationOptions) {
        const type = options.type || 'info';
        const notif = document.createElement('div');
        notif.style.cssText = `
            background: rgba(20, 20, 20, 0.95);
            border-left: 4px solid ${this.getColor(type)};
            color: #fff;
            padding: 12px 16px;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            min-width: 300px;
            max-width: 450px;
            font-family: monospace;
            font-size: 13px;
            pointer-events: auto;
            transition: opacity 0.3s ease, transform 0.3s ease;
            transform: translateX(120%);
            opacity: 0;
            display: flex;
            flex-direction: column;
            gap: 8px;
            cursor: pointer;
        `;

        if (options.title) {
            const titleEl = document.createElement('strong');
            titleEl.style.fontSize = '14px';
            titleEl.style.color = this.getColor(type);
            titleEl.textContent = options.title;
            notif.appendChild(titleEl);
        }

        const msgEl = document.createElement('div');
        msgEl.textContent = options.message;
        msgEl.style.whiteSpace = 'pre-wrap';
        msgEl.style.wordBreak = 'break-word';
        msgEl.style.color = '#ccc';
        notif.appendChild(msgEl);

        if (options.actions && options.actions.length > 0) {
            const actionsContainer = document.createElement('div');
            actionsContainer.style.display = 'flex';
            actionsContainer.style.gap = '8px';
            actionsContainer.style.flexWrap = 'wrap';
            actionsContainer.style.marginTop = '4px';
            
            options.actions.forEach(action => {
                const btn = document.createElement('button');
                btn.textContent = action.label;
                btn.style.cssText = `
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    color: #fff;
                    padding: 4px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                    transition: background 0.2s;
                `;
                btn.onmouseover = () => btn.style.background = 'rgba(255,255,255,0.2)';
                btn.onmouseout = () => btn.style.background = 'rgba(255,255,255,0.1)';
                btn.onclick = (e) => {
                    e.stopPropagation();
                    action.onClick();
                    
                    // Visual feedback
                    const originalText = btn.textContent;
                    btn.textContent = 'Skopiowano!';
                    btn.style.background = 'rgba(34, 197, 94, 0.4)';
                    setTimeout(() => {
                        btn.textContent = originalText;
                        btn.style.background = 'rgba(255,255,255,0.1)';
                    }, 1000);
                };
                actionsContainer.appendChild(btn);
            });
            notif.appendChild(actionsContainer);
        }

        this.container.appendChild(notif);

        // Force reflow
        void notif.offsetWidth;
        
        notif.style.transform = 'translateX(0)';
        notif.style.opacity = '1';

        const duration = options.duration !== undefined ? options.duration : 6000;
        let timeoutId: any;
        
        const dismiss = () => {
            notif.style.transform = 'translateX(120%)';
            notif.style.opacity = '0';
            setTimeout(() => {
                if (notif.parentNode) {
                    notif.parentNode.removeChild(notif);
                }
            }, 300);
        };
        
        const startTimer = (timeMs: number = duration) => {
            if (timeMs > 0) {
                if (timeoutId) clearTimeout(timeoutId);
                timeoutId = setTimeout(dismiss, timeMs);
            }
        };

        const stopTimer = () => {
            if (timeoutId) clearTimeout(timeoutId);
        };

        if (duration > 0) {
            startTimer(duration);
        }

        notif.addEventListener('mouseenter', stopTimer);
        notif.addEventListener('mouseleave', () => {
            if (duration > 0) {
                startTimer(2000);
            }
        });
        
        notif.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).tagName !== 'BUTTON') {
                stopTimer();
                dismiss();
            }
        });
    }

    private getColor(type: NotificationType) {
        switch (type) {
            case 'error': return '#ef4444';
            case 'success': return '#22c55e';
            case 'log': return '#a855f7';
            case 'info': 
            default: return '#3b82f6';
        }
    }
}

export const notifications = new NotificationManager();
