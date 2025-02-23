//function to switch pages

const showPage = (pageId) => {
    // Hide all pages first
    document.getElementById("login-form-container").style.display = "none";
    document.getElementById("register-form-container").style.display = "none";
    document.getElementById("stock-price-container").style.display = "none";

    // Show the requested page
    document.getElementById(pageId).style.display = "block";
};

// Function to get stock price from the backend API
const getStockPrice = async () => {
    const symbol = document.getElementById("stockSymbol").value.trim();
    


    // If no symbol is entered, return early
    if (!symbol) {
        alert("Please enter a stock symbol.");
        return;
    }
    
    try {
        // Sending a request to the backend API
        const response = await fetch(`/api/stock?symbol=${symbol}`);
        
        // Check if the response is OK (status code 200)
        if (!response.ok) {
            throw new Error("Failed to fetch stock price");
        }
        
        // Parse the JSON response
        const data = await response.json();
        
        // If the stock price exists in the response, display it
        if (data.price) {
            document.getElementById("result").innerHTML = 
                `The current price of ${symbol.toUpperCase()} is $${data.price}`;
            
            // Show the "Track this stock" button after price is displayed
            document.getElementById("trackButtonContainer").style.display = "block";
        } else {
            document.getElementById("result").innerHTML = 
                "Sorry, no price found for this symbol.";
        }
    } catch (error) {
        // If there's an error, display it to the user
        document.getElementById("result").innerHTML = 
            `Error: ${error.message}`;
    }
};

const trackStock = async () => {
    const symbol = document.getElementById("stockSymbol").value.trim();
    
    // If no symbol is entered, return early
    if (!symbol) {
        alert("Please enter a stock symbol.");
        return;
    }

    const token = localStorage.getItem('token'); // Get token from local storage (assumes JWT is stored here)

    // If no token is found, alert the user to log in
    if (!token) {
        alert("You must be logged in to track stocks.");
        return;
    }

    try {
        // Sending a request to add the stock to the user's tracked list
        const response = await fetch('/api/track-stock', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`  // Send token for authentication
            },
            body: JSON.stringify({ tickerSymbol: symbol })
        });

        const data = await response.json();
        
        if (response.ok) {
            alert(`${symbol.toUpperCase()} is now being tracked!`);
            location.reload(); // Reload the page to reflect changes
        } else {
            alert('Error: ' + data.message);
        }

        // Optionally hide the "Track this stock" button after stock is tracked
        document.getElementById("trackButtonContainer").style.display = "none";

    } catch (error) {
        alert(`Error: ${error.message}`);
    }
};


// Function to show the alert fields when "Track this stock" is clicked
const showAlertFields = () => {
    // Show the alert input fields
    document.getElementById("alertFields").style.display = "block";
};

// Function to show the registration form and hide the login form
const showRegisterForm = () => {
    document.getElementById("login-form-container").style.display = "none";
    document.getElementById("register-form-container").style.display = "block";
};

// Function to show the login form and hide the registration form
const showLoginForm = () => {
    document.getElementById("login-form-container").style.display = "block";
    document.getElementById("register-form-container").style.display = "none";
};

// Function to handle user registration
const handleRegistration = async (event) => {
    event.preventDefault(); // Prevent form submission

    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value.trim();
    const phone = document.getElementById("register-phone").value.trim();

    if (!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, phone })
        });

        const data = await response.json();
        
        if (response.ok) {
            alert('Registration successful! You can now log in.');
            showLoginForm(); // Switch to login form after successful registration
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
};

// Function to handle user login
const handleLogin = async (event) => {
    event.preventDefault(); // Prevent form submission

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();

    if (!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Store the token in local storage after successful login
            localStorage.setItem('token', data.token);
            alert('Login successful!');
            showPage("stock-price-container"); // Show the home screen
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
};

// Attach event listeners to forms
document.getElementById("register-form").addEventListener("submit", handleRegistration);
document.getElementById("login-form").addEventListener("submit", handleLogin);

// Attach event listener to the track button
document.getElementById("trackButtonContainer").addEventListener("click", trackStock);
