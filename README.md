# Tawkify Coding Homework
Purpose: Build a list input control component that allows users to create / modify a list that can be submitted
as part of a form.

## Requirements

### Props
- label
- placeholder
- required - if true, validate that the list is not empty
- disabled - if true, prevent new inputs and removal of existing items
- max - int, number of list items cannot exceed this value

### Other Requirements
- basic error handling
- show helpful validation errors to the user

## Solution
My solution implements 2 components, `TawkifyFormListInput` and `TawkifyListInput`. `TawkifyFormListInput` is the parent
component and accepts all the props from the Requirements section. `TawkifyListInput` is a dumb component that renders
the user input portion of the overall component.

### Features
- "uncontrolled" and "controlled" modes
    - in "uncontrolled" mode, list state is managed by `TawkifyFormListInput` and exposes an `update` prop (callback fn)
      so a client may handle updates to the list
    - in "controlled" mode, list state is managed by the client (presumably a parent component, or by using `redux`) for
    more complete control over how updates are handled.
- when typing text into the input field, pressing the "Enter" key will add the text to the list
- list items can be dragged to re-order
- list items can be deleted by clicking the "x"
- if the `max` prop is provided, attempting to add more than `max` items to a list will print a validation error
- if the `disabled` prop is provided, attempting to modify the list in any way will print a validation error
- if the `required` prop is provided, empty strings will not be accepted.

### Lingering Questions
- Since the form submission and form state is largely left up to the client, validation for the `required` prop is
  somewhat limited in this implementation. As is implemented now, `TawkifyFormListInput` does not throw errors if the 
  list has no entries, even if `required` is true. This is intentional and mainly relates to `separation of concerns`. 
  Ultimately, `TawkifyFormListInput` should not be responsible for final validation of form submission / form data, so
  this is left up to the client.
  
### Issues
- During the "drag and drop" operation on Safari mobile, there is a minor spacing issue  for the 
  `Regular list (controlled)` 
  
### Setup
- `git clone https://github.com/kevin-coelho/tawkify-react-form-demo.git`
- `cd tawkify-react-form-demo`
- `npm install` or `pnpm install`
- Make a production build: `npm run build` or `pnpm run build`

### Run the app
- **Front end** `npm run dev` or `pnpm run dev`
- **Back end** (required for Submit button to work) `npm start` or `pnpm start`

### Sample App
- building and starting this repo will load a sample app in which a few examples of using this form are provided
in various modes
- clicking "Submit" will cause the form to submit. When running the back end of the sample app, the form submission
  will be accepted by `node.js` and return a `200` status response, and log the form submission to the back end
- clicking "Throw an error" will throw a front-end rendering error to demonstrate the use of a React `ErrorBoundary`
    - once the error is thrown, the page will have to be reloaded

### Front End Libs
- `React`, `Material UI`, `react-beautiful-dnd`, `axios`, `webpack`

### Back End Libs / Infra
- `node.js`, `express.js`, `heroku`
  
### Code Quality
- `prettier.js`, `eslint`, `.editorconfig`

## Possible Extensions
- back end validation using `joi`
- drag/drop items between separate lists
- custom validation on individual list items (are they supposed to be numbers, text, email addresses, ...?)

## References
- https://www.freecodecamp.org/news/how-to-add-drag-and-drop-in-react-with-react-beautiful-dnd/

## Other Info
- time taken `~6.5 hrs`