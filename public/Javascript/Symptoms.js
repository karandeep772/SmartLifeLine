document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("symptomContainer");
    const addBtn = document.getElementById("addSymptomBtn");
    const form = document.getElementById("symptomForm");
    const resultsContainer = document.getElementById("resultsContainer"); // Get the new div
    
    let count = 1;

    // --- This is your existing "Add Symptom" logic ---
    // --- It's perfect, no changes needed ---
    addBtn.addEventListener("click", () => {
        if (count >= 10) {
            alert("You can add a maximum of 10 symptoms.");
            return;
        }
        count++;
        const div = document.createElement("div");
        div.classList.add("symptom-field");
        div.innerHTML = `
            <label>Symptom ${count}:</label>
            <input type="text" name="symptoms[]" required>
        `;
        container.appendChild(div);
    });


    // --- 👇 THIS IS THE NEW LOGIC TO SUBMIT THE FORM 👇 ---
    form.addEventListener("submit", async (event) => {
        // 1. Stop the browser from refreshing the page
        event.preventDefault(); 
        
        // 2. Clear old results and show a loading message
        resultsContainer.innerHTML = "<i>Generating advice, please wait...</i>";

        // 3. Get all the symptom inputs
        const symptomInputs = container.querySelectorAll('input[name="symptoms[]"]');
        
        // 4. Create an array of just the text values
        const symptoms = Array.from(symptomInputs).map(input => input.value);

        try {
            // 5. Send the data to your server as JSON
            const response = await fetch("/submit-symptoms", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ symptoms: symptoms }), // Matches req.body.symptoms
            });

            if (!response.ok) {
                // Handle server errors
                throw new Error("Server error, please try again.");
            }

            // 6. Get the JSON response back from the server
            const result = await response.json();

            // 7. Display the AI's advice in the results div
            // We replace newlines (\n) with <br> tags for proper HTML display
            const formattedAdvice = result.rephrasedContentskill.replace(/\n/g, '<br>');
            resultsContainer.innerHTML = `
                <h3>Medical Advice:</h3>
                <p>${formattedAdvice}</p>
            `;

        } catch (error) {
            // 8. Show an error message if something went wrong
            console.error("Error submitting symptoms:", error);
            resultsContainer.innerHTML = `<p style="color:red;">${error.message}</p>`;
        }
    });
});