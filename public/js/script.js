// Example starter JavaScript for disabling form submissions if there are invalid fields
(() => {
  "use strict";

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll(".needs-validation");

  // Loop over them and prevent submission
  Array.from(forms).forEach((form) => {
    form.addEventListener(
      "submit",
      (event) => {
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
        }

        form.classList.add("was-validated");
      },
      false
    );
  });
})();

// Pop animation for the pass card
document.addEventListener("DOMContentLoaded", () => {
  const passCard = document.getElementById("passCard");

  if (passCard) {
    passCard.addEventListener("click", () => {
      passCard.classList.add("pop");

      setTimeout(() => {
        passCard.classList.remove("pop");
      }, 300);
    });
  }
});
