"use strict";

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");
///////////////////////////////////
// Creating Classes for Workouts
class Workout {
  date = new Date();
  // for id better to use separate library, but for this proj we manually create it - (convert date to string and take 10 last symbols)
  id = (Date.now() + "").slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
    // return this.description;
  }
}

class Running extends Workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    // min / km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = "cycling";
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    // km / h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([30, 12], 5.3, 30, 540);
// const cyc2 = new Cycling([31, 10], 15.5, 55, 740);
// console.log(run1, cyc2);
///////////////////////////////////
// App
class App {
  // setting global vars
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  constructor() {
    // get geo
    this._getPosition();

    // load data from storage
    this._getLocalStorage();

    // attach eventListeners
    form.addEventListener("submit", this._newWorkout.bind(this));
    inputType.addEventListener("change", this._toggleElevationField);
    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert("Could not get your location!");
      }
    );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(
    //   `https://www.google.com.ua/maps/@${latitude},${longitude},14z?hl=ua`
    // );
    const coords = [latitude, longitude];
    // leaflet library in use
    /*Here we create a map in the 'map' div, add tiles of our choice,
     * and then add a marker with some text in a popup: */
    // default map location (takes 2 args - array of lat/long and defult zoom)

    // here we reasign a variable that will store our map object
    // console.log(this);
    this.#map = L.map("map").setView(coords, this.#mapZoomLevel);

    // each map consist from tiles and below we can change the provider and a stile
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      // L.tileLayer("https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // implementing marker on click. We can`t use regular event handler because we need
    // access to coordinats, not only the position in the screen
    // so we use custom nethod from leaflet lib
    this.#map.on("click", this._showForm.bind(this));
    // setting markers from local storage
    this.#workouts.forEach((work) => this._renderOnMap(work));
  }

  _showForm(mapEv) {
    // render the form on click
    form.classList.remove("hidden");
    // make distance field active by default for better user experiance
    inputDistance.focus();
    // saving event Object to global var to acces from outside this event
    this.#mapEvent = mapEv;
  }

  _hideForm() {
    inputDistance.value = inputDuration.value = inputCadence.value = "";
    //if we just add 'hidden' we will see the animation of hidding and workout replacing the form. We can avoid it by using 'dirty trick':
    form.style.display = "none"; // make it invisible right away
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000); // return propper display value after animation ended (1s in our case)
  }

  _toggleElevationField() {
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
  }

  _moveToPopup(e) {
    // get html doc
    const workoutEl = e.target.closest(".workout");
    if (!workoutEl) return;
    // console.log(workoutEl);
    // get workout instance that has same id from App array
    const workout = this.#workouts.find(
      (work) => work.id === workoutEl.dataset.id
    );
    // console.log(workout);
    // set map position to coords of workout inctance
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _newWorkout(e) {
    // some helper functions
    const allNumbers = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

    e.preventDefault();
    // get the data form the list
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // if workout is running, create running object
    if (type === "running") {
      const cadence = +inputCadence.value;
      // check if data is valid
      if (
        !allNumbers(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert("Inputs should be positive numbers!");
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // if workout is cycling, create cycling object
    if (type === "cycling") {
      const elevation = +inputElevation.value;
      if (
        !allNumbers(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert("Inputs should be positive numbers!");
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // add new object to workout array
    this.#workouts.push(workout);
    // console.log(workout._setDescription());

    // render workout on the map
    // console.log(this.#mapEvent);
    this._renderOnMap(workout);

    //   customizing the pop-up

    //render workout on the list
    this._renderOnList(workout);

    // clearing inputs
    this._hideForm();

    // Save to lacal storage
    this._setLocalStorage();
  }
  _renderOnMap(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`
      )
      .openPopup();
  }

  _renderOnList(workout) {
    let html = `
<li class="workout workout--${workout.type}" data-id="${workout.id}">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>
    `;
    if (workout.type === "running") {
      html += `
    <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
    </div>
</li>`;
    }
    if (workout.type === "cycling") {
      html += `
    <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
    </div>
</li>`;
    }
    form.insertAdjacentHTML("afterend", html);
  }

  _setLocalStorage() {
    // save key-value pair to loc stor and convert obj to string
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    // restore objects from sting
    const data = JSON.parse(localStorage.getItem("workouts"));
    // guard protection
    if (!data) return;
    // load saved data to workouts array
    this.#workouts = data;
    // render this workouts to list
    this.#workouts.forEach((work) => this._renderOnList(work));
    //and we need to render it on the map also, but map is loading later(async) so we need to do it in the _loadMap() after #map is actually created
  }

  // Public Interface
  reset() {
    localStorage.removeItem("workouts");
    // programatically reload the page
    location.reload();
  }
}

const app = new App();
