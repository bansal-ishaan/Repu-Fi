// This function creates and injects our message div
function showMyMessage() {
  // 1. Create a new <div> element
  const messageDiv = document.createElement('div');

  // 2. Set its content and a unique ID for styling
  messageDiv.id = 'my-naukri-extension-message';
  messageDiv.textContent = 'Hello from your Custom Extension! Good luck with your job search! 👍';

  // 3. Add the new element to the top of the webpage's body
  document.body.prepend(messageDiv);

  console.log("Naukri Text Extension has loaded!");
}

// Run the function once the page is loaded
showMyMessage();