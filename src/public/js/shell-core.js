document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('terminal-container');
    if (!container) {
        console.error('Terminal container element not found!');
        return;
    }

    const username = container.getAttribute('data-username') || 'web-os';

    let currentDirId = null; 
    let currentPath = '/';
    // Local buffer to accumulate character input before sending to server
    let currentInput = '';

    const term = new window.Terminal({
        cursorBlink: true,
        fontFamily: 'Terminus, monospace',
        fontSize: 14,
        cursorStyle: 'block'
    });

    // --- MOUSE CURSOR AUTO-HIDE LOGIC ---
    let mouseTimer = null;

    function showCursor() {
        document.body.classList.remove('hide-cursor');
        clearTimeout(mouseTimer);
        // Hide cursor after 2 seconds of inactivity
        mouseTimer = setTimeout(() => {
            document.body.classList.add('hide-cursor');
        }, 2000);
    }

    // Show cursor when mouse moves
    document.addEventListener('mousemove', showCursor);
    
    // Hide cursor immediately when typing starts
    document.addEventListener('keydown', () => {
        document.body.classList.add('hide-cursor');
        clearTimeout(mouseTimer);
    });

    // Initialize auto-hide on load
    showCursor();
    // -------------------------------------

    term.open(container);
    
    term.writeln(`Welcome back, ${username}! Web OS Core Connection... OK`);
    term.write(`\x1b[32m${username}\x1b[0m:\x1b[34m${currentPath}\x1b[0m:~$`);

    async function sendCommand(cleanCommand) {
        if (!cleanCommand) {
            term.write(`\x1b[32m${username}\x1b[0m:\x1b[34m${currentPath}\x1b[0m:~$`);
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
                body: JSON.stringify({ 
                    command: cleanCommand,
                    currentDirId : currentDirId
                 })
            });

            if (response.redirected) {
                window.location.href = response.url;
                return;
            }

            const data = await response.json();

            if (data) {
                if (data.newDirId !== undefined) {
                    currentDirId = data.newDirId;
                }

                if (data.output !== undefined && data.output !== null) {
                    if (data.output === '__CLEAR_SCREEN__') {
                        term.clear(); 
                    }
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
                    else if (data.output.startsWith('__REDIRECT:')) {
                        const targetUrl = data.output.replace('__REDIRECT:', '').replace('__', '');
                        term.writeln(`\x1b[32mOpening subsystem path: ${targetUrl}...\x1b[0m`);
                        setTimeout(() => {
                            window.location.href = targetUrl;
                        }, 800);
                        return;
                    }
                    else if (data.output.startsWith('__WFS_OAUTH_INIT:')) {
                        const authUrl = data.output.replace('__WFS_OAUTH_INIT:', '').replace('__', '');

                        term.writeln('\r\n\x1b[33m⚠️  WARNING: Connect a clean Google Drive account for better privacy.\x1b[0m');
                        term.writeln('\x1b[32m[WFS]: Launching secure external Google OAuth2 pipeline...\x1b[0m');

                        setTimeout(() => {
                            window.open(authUrl, '_blank');
                        }, 1000);

                        term.write(`\r\n\x1b[32m${username}\x1b[0m:\x1b[34m${currentPath}\x1b[0m:~$`);
                        return;
                    }
                    else if (data.output === '__SHUTDOWN_OS__') {
                        term.writeln('\x1b[31mShutting down core-sh engine...\x1b[0m');
                            
                        setTimeout(() => {
                            window.close();
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
                        term.writeln(data.output);
                    }
                }
            } else if (data && data.error) {
                term.writeln(`\x1b[31mServer Error: ${data.error}\x1b[0m`);
            }
        } catch (error) {
            term.writeln('\x1b[31mError: Lost connection to Express core.\x1b[0m');
        }

        try {
            const pathResponse = await fetch('/api/shell', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: 'pwd', currentDirId: currentDirId })
            });
            const pathData = await pathResponse.json();
            currentPath = pathData.output.trim();
        } catch (e) {
            currentPath = '/';
        }

        term.write(`\x1b[32m${username}\x1b[0m:\x1b[34m${currentPath}\x1b[0m:~$`);
    }

    // Handle interactive terminal data input stream character-by-character
    term.onData((data) => {
        // 1. If Enter key is pressed (carriage return \r or line feed \n)
        if (data === '\r' || data === '\n') {
            const cleanCommand = currentInput.trim();
            term.write('\r\n'); // Move cursor to the next line visually
            
            sendCommand(cleanCommand); // Dispatch the fully constructed command to backend
            
            currentInput = ''; // Reset input buffer for the next command sequence
        } 
        // 2. If Backspace key is pressed (DEL \x7F or backspace \b)
        else if (data === '\x7F' || data === '\b') {
            if (currentInput.length > 0) {
                currentInput = currentInput.slice(0, -1); // Remove the last character from buffer
                term.write('\b \b'); // Clear the character visually on the terminal screen
            }
        } 
        // 3. Ignore other control characters (e.g. arrow keys, page up/down)
        else if (data.charCodeAt(0) < 32 && data !== '\r' && data !== '\n' && data !== '\b') {
            return;
        }
        // 4. Standard keyboard character inputs
        else {
            currentInput += data; // Append key character to local buffer
            term.write(data); // Render the character directly to screen (local echo)
        }
    });
});