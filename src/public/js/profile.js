async function handleDelete(event) {
            event.preventDefault();

            const passwordInput = document.getElementById('password');
            const alertBox = document.getElementById('alertBox');
            const password = passwordInput.value.trim();

            if (!password) return;

            // Clear previous alerts
            alertBox.style.display = 'none';
            alertBox.className = 'alert';

            try {
                // Dynamically fetch current user ID injected from Express route if available, or use direct endpoint
                const response = await fetch('/api/users/<%= user.id || user._id %>', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ password })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    alertBox.textContent = 'Account destroyed successfully. Redirecting...';
                    alertBox.className = 'alert success';
                    alertBox.style.display = 'block';

                    // Clear local state variables if applicable
                    if (window.accessToken) window.accessToken = null;
                    if (window.currentUser) window.currentUser = null;

                    // Clean cookies and session via backend auth clean flow
                    setTimeout(() => {
                        window.location.href = '/register';
                    }, 1500);
                } else {
                    // Output error message returned from the controller
                    alertBox.textContent = data.error || 'Failed to delete account. Incorrect password.';
                    alertBox.className = 'alert error';
                    alertBox.style.display = 'block';
                }
            } catch (error) {
                alertBox.textContent = 'Network error: Failed to reach security core.';
                alertBox.className = 'alert error';
                alertBox.style.display = 'block';
            }
        }