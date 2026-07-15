window.Terminal = class {
    constructor(options) {
        this.options = options || {};
        this.container = null;
        this.inputCallback = null;
    }

    open(element) {
        this.container = element;
        this.container.classList.add('xterm');
        this.container.style.backgroundColor = '#12141a';
        this.container.style.color = '#f1f5f9';
        this.container.style.overflowY = 'auto';
        this.container.style.whiteSpace = 'pre-wrap';
        this.container.style.padding = '16px';
        this.container.style.height = '100%';
        this.container.style.boxSizing = 'border-box';

        this.container.addEventListener('click', () => {
            const input = document.getElementById('term-line-input');
            if (input) input.focus();
        });
    }

    write(text) {
        if (!this.container) return;
        let formatted = text
            .replace(/\x1b\[31m/g, '<span style="color:#ff3333">') // Красный
            .replace(/\x1b\[32m/g, '<span style="color:#33ff33">') // Зелёный
            .replace(/\x1b\[34m/g, '<span style="color:#3399ff">') // Синий
            .replace(/\x1b\[0m/g, '</span>')
            .replace(/\r\n/g, '<br>')
            .replace(/\n/g, '<br>');

        if (formatted.includes(':~$')) {
            const promptParts = formatted.split(':~$');
            const currentPromptUser = promptParts[0].replace('<br>', '').trim();

            this.container.innerHTML += `<br><span class="term-info" style="font-weight:600;">${currentPromptUser}</span>:~$ <input type="text" id="term-line-input" autofocus autocomplete="off">`;

            setTimeout(() => {
                const input = document.getElementById('term-line-input');
                if (input) {
                    input.focus(); 
                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            const cmd = input.value;
                            input.remove();
                            this.container.innerHTML += cmd + '<br>';
                            if (this.inputCallback) this.inputCallback(cmd);
                        }
                    });
                }
            }, 10);
        } else {
            this.container.innerHTML += formatted;
        }

        this.container.scrollTop = this.container.scrollHeight;
    }

    writeln(text) {
        this.write(text + '\r\n');
    }

    clear() {
        if (this.container) this.container.innerHTML = '';
    }

    onData(callback) {
        this.inputCallback = callback;
    }
};