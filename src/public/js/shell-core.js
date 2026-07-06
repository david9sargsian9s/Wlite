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
