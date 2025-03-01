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

            //then display track stock button
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

const trackStock = async () =>{
    const symbol = document.getElementById("stockSymbol").value.trim();
    const token = localStorage.getItem('token');

    console.log("Token:", token);  // Check the token in the console
    console.log("Symbol:", symbol);  // Check the symbol entered by the user


    if (!symbol) {
        alert("Please enter a stock symbol.");
        return;
    }

    if (!token) {
        alert("You must be logged in to track stocks.");
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/track-stock', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
              },
            body: JSON.stringify({ tickerSymbol: symbol })
        });

    const data = await response.json();
    
    if (response.ok) {
        alert(`${symbol.toUpperCase()} is now being tracked!`);
        document.getElementById("trackStockButton").style.display = "none"; // Hide button after tracking
    } else {
        alert('Error: ' + data.message);
    }
} catch (error) {
    alert(`Error: ${error.message}`);
}
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

