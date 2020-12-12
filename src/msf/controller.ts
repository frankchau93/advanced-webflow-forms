import { isVisible, validateEmail, isFormElement } from './helpers';
import View from './view';

export default class Controller {
  currentStep: number = 0;
  alertShown: boolean = false;
  constructor(private view: View) {
    this.view = view;
    this.init();
  }

  /**
   * Init Functionalities
   */
  init() {
    // Set mask height to fit the first slide
    this.view.setMaskHeight(this.currentStep);

    // Disable back button
    this.view.disableElement(this.view.back);

    // Set buttons text
    this.view.setButtonText(this.currentStep);

    // Show the current step
    this.view.setStepsDisplay(this.currentStep);

    // Create the hidden form
    this.view.createHiddenForm();

    // Hide the alert if no Webflow Ix2 is provided
    this.setAlert();

    // Set event listeners
    this.setEvents();
  }

  /**
   * Add event listeners
   */
  setEvents() {
    // Set functions
    const nextClick = () => {
      this.nextClick();
    };
    const backClick = () => {
      this.backClick();
    };
    const navClick = (e: MouseEvent) => {
      this.navClick(e);
    };
    const handleInput = (e: Event) => {
      this.handleInput(e);
    };
    const submitHiddenForm = () => {
      if (this.currentStep === this.view.hiddenFormStep) {
        this.view.submitHiddenForm();
        this.view.rightArrow.removeEventListener('click', submitHiddenForm);
      }
    };

    // Add event listeners
    this.view.next.addEventListener('click', nextClick);

    if (this.view.back) this.view.back.addEventListener('click', backClick);

    this.view.navLinks.forEach((link) => {
      link.addEventListener('click', navClick);
    });

    this.view.inputs.forEach((input) => {
      input.addEventListener('input', handleInput);
    });

    if (this.view.sendHiddenForm)
      this.view.rightArrow.addEventListener('click', submitHiddenForm);
  }

  /**
   * Perform actions when the next button is clicked
   */
  nextClick() {
    const filledFields = this.checkRequiredInputs();

    // If required fields are missing, show alert and return
    if (!filledFields) {
      this.showAlert();
      return;
    }

    // Increase step count
    this.currentStep++;

    // If current step is 1, enable back button
    if (this.currentStep === 1) this.view.enableElement(this.view.back);

    // Perform actions depending on current step
    if (this.currentStep === this.view.steps.length) {
      this.view.submitForm();
      this.view.disableButtons();
      this.view.hideButtons();
    } else {
      this.view.goNext();
      this.view.setMaskHeight(this.currentStep);
      this.view.setButtonText(this.currentStep);
      this.view.setStepsDisplay(this.currentStep);
    }

    // Hide Alert
    this.hideAlert();

    // Scroll to the top of the form
    this.view.scrollTop();
  }

  /**
   * Perform actions when the next button is clicked
   */
  backClick() {
    const previousStep = this.currentStep - 1;

    // If user is on the first step, return
    if (previousStep < 0) return;

    // Go to the previous step
    this.view.goBack();

    // Set mask height
    this.view.setMaskHeight(previousStep);

    // Set next button text
    this.view.setButtonText(previousStep);

    // Set steps display
    this.view.setStepsDisplay(previousStep);

    // Hide alert
    this.hideAlert();

    // Scroll to the top of the form
    this.view.scrollTop();

    // Set new current step
    this.currentStep = previousStep;

    // Disable back button
    if (this.currentStep === 0) this.view.disableElement(this.view.back);
  }

  /**
   * Handle click event on custom navigation elements
   * @param {Object} e - Event object
   */
  navClick(e: MouseEvent) {
    const target = e.currentTarget;
    if (!(target instanceof HTMLElement)) return;

    const dataset = target.dataset.msfNav!;
    const step = +dataset - 1;

    // Go to requested step only if its lower than the current step

    this.view.sliderDots[step].click();
    this.currentStep = step;
    this.view.setMaskHeight(this.currentStep);
    this.view.setButtonText(this.currentStep);
    this.view.setStepsDisplay(this.currentStep);
    if (this.currentStep === 0) this.view.disableElement(this.view.back);
  }

  /**
   * Handle input event: if input is filled, remove warning class and set correspondent values
   * @param {Object} e - Event object
   */
  handleInput(e: Event) {
    const input = e.currentTarget;
    if (!isFormElement(input)) return;

    let value: string | boolean = '-';

    // Perform actions depending on input type
    switch (input.type) {
      case 'checkbox':
        if (!(input instanceof HTMLInputElement)) break;

        // Set the checkbox value
        value = input.checked;

        // Get Webflow's custom checkbox element and remove the warning class
        const checkboxField = input.parentElement;
        if (!checkboxField) break;
        const checkbox = checkboxField.querySelector('.w-checkbox-input');

        if (input.checked && checkbox) this.view.removeWarningClass(checkbox);
        break;

      case 'radio':
        // Get the checked radio
        const checkedOption = this.view.form.querySelector(
          `input[name="${input.name}"]:checked`
        );

        // If exists, set its value
        if (checkedOption instanceof HTMLInputElement)
          value = checkedOption.value;
        else break;

        // Get Webflow's custom radio and remove warning class
        const radioField = input.parentElement;
        if (!radioField) break;

        const radio = radioField.querySelector('.w-radio-input');
        if (radio) this.view.removeWarningClass(radio);
        break;

      default:
        if (!input.value) break;
        if (input.type === 'email' && !validateEmail(input.value)) break;

        value = input.value;
        this.view.removeWarningClass(input);
    }

    // Set values of display and hidden form elements
    this.view.setValues(input, value);
  }

  /**
   * Check if all the required inputs in the current steps are filled and add a warning to those who are not
   * Returns true or false
   */
  checkRequiredInputs() {
    const inputs = this.view.getInputs(this.currentStep);
    const requiredInputs = inputs.filter(
      (input) => input.required && isVisible(input)
    );
    let filledInputs = 0;

    requiredInputs.forEach((input) => {
      switch (input.type) {
        case 'checkbox':
          // Check if input is valid
          if (input.checkValidity()) {
            filledInputs++;
            break;
          }

          // If not, get Webflow's custom checkbox element and set the warning class
          const checkboxField = input.parentElement;
          if (!checkboxField) break;
          const checkbox = checkboxField.querySelector('.w-checkbox-input');

          if (checkbox) this.view.addWarningClass(checkbox);
          break;

        case 'radio':
          // Check if input is valid
          if (input.checkValidity()) {
            filledInputs++;
            break;
          }

          // If not, get Webflow's custom radio and add warning class
          const radioField = input.parentElement;
          if (!radioField) break;
          const radio = radioField.querySelector('.w-radio-input');

          if (radio) this.view.addWarningClass(radio);

          break;

        default:
          // If input or email is not valid, add warning class
          if (
            !input.checkValidity() ||
            (input.type === 'email' && !validateEmail(input.value))
          ) {
            this.view.addWarningClass(input);
            break;
          }

          filledInputs++;
      }
    });

    return filledInputs === requiredInputs.length ? true : false;
  }

  setAlert() {
    if (this.view.alertInteraction) return;

    this.view.hideElement(this.view.alert, true);
  }

  showAlert() {
    if (this.alertShown) return;

    this.view.showAlert();
    this.alertShown = true;
  }

  hideAlert() {
    if (!this.alertShown) return;

    this.view.hideAlert();
    this.alertShown = false;
  }

  observeSubmitText() {
    const submitButton = this.view.submitButton;

    // Observe config
    const config = {
      attributes: true,
    };

    // Ofserve callback: Modify next button text if submit button changes
    const callback = (mutationsList: MutationRecord[]) => {
      mutationsList.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'value'
        )
          this.view.next.textContent = submitButton.value;
      });
    };

    // Init mutation observer
    const observer = new MutationObserver(callback);
    observer.observe(this.view.submitButton, config);
  }
}
