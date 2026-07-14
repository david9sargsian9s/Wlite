const container = document.getElementById('terminal-container');
const username = container.getAttribute('data-username') || 'web-os';

const term = new window.Terminal({
    cursorBlink: true,
    cursorStyle: 'block',
    theme: { background: '#000000', foreground: '#00ff00', cursor: '#00ff00' },
    fontFamily: 'Courier New, monospace',
    fontSize: 16
});

term.open(container);
term.writeln(`Welcome back, ${username}! Web OS Core Connection... OK`);
term.write(`${username}:~$ `);

term.onData(async (enteredText) => {
    const cleanCommand = enteredText ? enteredText.trim() : '';

    if (!cleanCommand) {
        term.write(`${username}:~$ `);
        return;
    }

    try {
        const response = await fetch('/api/shell', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ command: cleanCommand })
        });

        if (response.redirected) {
            window.location.href = response.url;
            return;
        }

        const data = await response.json();

        if (data && data.output) {
            if (data.output === '__CLEAR_SCREEN__') {
                term.clear(); 
            }
            // CHAINING STRUCTURE
            else if (data.output === '__LOGOUT_USER__') {
                window.accessToken = null; 
                window.currentUser = null;

                term.clear();
                term.writeln('\x1b[33mLogging out and securing session...\x1b[0m');

                setTimeout(() => {
                    window.location.href = '/auth/clear';
                }, 1000);
                return;
            } 
            // NEW: Intercepting the visit command signals smoothly
            else if (data.output.startsWith('__REDIRECT:')) {
                const targetUrl = data.output.replace('__REDIRECT:', '').replace('__', '');
                term.writeln(`\x1b[32mOpening subsystem path: ${targetUrl}...\x1b[0m`);
                setTimeout(() => {
                    window.location.href = targetUrl;
                }, 800);
                return;
            }
            else if (data.output.startsWith('__REDIRECT:')) {
                const targetUrl = data.output.replace('__REDIRECT:', '').replace('__', '');
                term.writeln(`\x1b[32mOpening subsystem path: ${targetUrl}...\x1b[0m`);
                setTimeout(() => { window.location.href = targetUrl; }, 800);
                return;
            }
            // >>> OUR NEW IMPLEMENTED HOOK FOR OUT CHANNEL <<<
            else if (data.output.startsWith('__WFS_OAUTH_INIT:')) {
                const authUrl = data.output.replace('__WFS_OAUTH_INIT:', '').replace('__', '');

                term.writeln('\r\n\x1b[33m⚠️  WARNING: Connect a clean Google Drive account for better privacy.\x1b[0m');
                term.writeln('\x1b[32m[WFS]: Launching secure external Google OAuth2 pipeline...\x1b[0m');

                // Gently open the Google authorization window in a new tab after a second
                setTimeout(() => {
                    window.open(authUrl, '_blank');
                }, 1000);

                term.write(`\r\n${username}:~$ `);
                return;
            }
            else if (data.output === '__SHUTDOWN_OS__') {
                term.writeln('\x1b[31mShutting down core-sh engine...\x1b[0m');
                    
                setTimeout(() => {
                    // 1. Try to close the browser tab natively
                    window.close();
                
                    // 2. Fallback: If the browser blocked window.close(), simulate system power off
                    document.body.innerHTML = `
                        <div style="
                            background: #000; 
                            color: #333; 
                            width: 100vw; 
                            height: 100vh; 
                            display: flex; 
                            flex-direction: column;
                            justify-content: center; 
                            align-items: center; 
                            font-family: monospace;
                            user-select: none;
                        ">
                            <p style="font-size: 1.5rem; margin-bottom: 10px;">[ System Power Off ]</p>
                            <p style="color: #222; font-size: 0.9rem;">It is now safe to close your browser tab.</p>
                        </div>
                    `;
                }, 1000);
                return;
            }
            else {
                const formattedOutput = data.output.replace(/\n/g, '\r\n');
                term.writeln(formattedOutput);
            }
        } else if (data && data.error) {
            term.writeln(`\x1b[31mServer Error: ${data.error}\x1b[0m`);
        }
    } catch (error) {
        term.writeln('\x1b[31mError: Lost connection to Express core.\x1b[0m');
    }

    term.write(`${username}:~$ `);
});
