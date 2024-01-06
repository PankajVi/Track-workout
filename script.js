'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; //[lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km;
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    // this.type = 'cycling';
    this.calSpeed();
    this._setDescription();
  }

  calSpeed() {
    // km/h
    this.speed = (this.distance * 60) / this.duration;
    return this.speed;
  }
}


/////////////////////////////////////////////////////
// APPLICATION ARCHITECTURE

const form = document.querySelector('.form');
const sort__devider = document.querySelector('.sort__devider');
const clr__all__btn = document.querySelector('.clr__all__btn');
const overview__btn = document.querySelector('.overview__btn');
const validation__msg = document.querySelector('.validation__msg');
const show__sort__btns = document.querySelector('.show__sort__btns');
const sort__buttons__container = document.querySelector(
  '.sort__buttons__container'
);
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const confirmation__msg = document.querySelector('.confirmation__msg');
class App {
  #map;
  #marker = new Map();
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    // Get user's Position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Sorting Cards
    this._sortingCard();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    clr__all__btn.addEventListener('click', this._reset);
    overview__btn.addEventListener('click', this._getOverview.bind(this));
    show__sort__btns.addEventListener('click', () => {
      sort__buttons__container.classList.toggle('zero__height');
      setTimeout(() => {
        if (!sort__buttons__container.classList.contains('zero__height')) {
          sort__buttons__container.classList.add('zero__height');
        }
      }, 5000);
    });

    form.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      form.classList.add('hidden');
    });
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];
    // console.log(this);

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hideForm() {
    // Clear the input field
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 5);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return this._showAlert();
      }

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        return this._showAlert();
      }

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);
    // console.log(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + Clear the input field
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    // leaflet
    const layer = L.marker(workout.coords)
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
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();

    // adding to the marker
    this.#marker.set(workout.id, layer);
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
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

    if (workout.type === 'running')
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
      <button class="remove__btn">×</button>
    </li>
    `;

    if (workout.type === 'cycling')
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
      <button class="remove__btn">×</button>
    </li>
    `;

    sort__devider.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    //calling removing function
    if (e.target.classList.contains('remove__btn')) {
      this._removeWorkout(workout);
    }

    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    // console.log(data);

    if (!data) return;
    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  _reset() {
    confirmation__msg.classList.remove('msg__hidden');
    document.querySelector('.msg__buttons').addEventListener('click', e => {
      if (e.target.classList.contains('yes__button')) {
        localStorage.removeItem('workouts');
        location.reload();
      } else if (e.target.classList.contains('no__button')) {
        confirmation__msg.classList.add('msg__hidden');
      }
    });
  }

  _removeWorkout(workout) {
    // removing data from #workouts
    const idx = this.#workouts.indexOf(workout);
    const el = document.querySelector(`[data-id="${workout.id}"`);
    el.parentNode.removeChild(el);
    this.#workouts.splice(idx, 1);

    // removing data from local storage
    const storedItem = JSON.parse(localStorage.getItem('workouts'));
    const afterRemoved = storedItem.filter(work => work.id !== workout.id);
    localStorage.setItem('workouts', JSON.stringify(afterRemoved));

    // removing marker from map
    const layer = this.#marker.get(workout.id);
    layer.remove();
  }

  _getOverview(e) {
    const layerArray = [];
    this.#marker.forEach((layer, id) => {
      layerArray.push(layer);
    });

    const group = new L.featureGroup(layerArray);
    this.#map.fitBounds(group.getBounds(), { padding: [50, 50] });
  }

  _showAlert() {
    validation__msg.classList.add('msg__show');
    setTimeout(() => validation__msg.classList.remove('msg__show'), 2000);
  }

  _sortingCard() {
    const distance = document.querySelector(`[data-type="distance"]`);
    const duration = document.querySelector(`[data-type="duration"]`);
    const running = document.querySelector(`[data-type="running"]`);
    const cycling = document.querySelector(`[data-type="cycling"]`);

    // sorting distance
    distance.addEventListener('click', () => {
      this.#workouts.sort(function (a, b) {
        return a.distance - b.distance;
      });
      this._insertCard();
    });
    // sorting duration
    duration.addEventListener('click', () => {
      this.#workouts.sort(function (a, b) {
        return a.duration - b.duration;
      });
      this._insertCard();
    });

    // sorting Running and Cycling
    let runningWorkout=[];
    let cyclingWorkout=[];
    this.#workouts.forEach((work)=>{
      if(work.type === 'running'){
        runningWorkout.push(work);
      }else{
        cyclingWorkout.push(work);
      }
    })
    //Running
    running.addEventListener('click', ()=>{
      this.#workouts = [...cyclingWorkout, ...runningWorkout];
      this._insertCard();
    })
    
    //Cycling
    cycling.addEventListener('click', ()=>{
      this.#workouts = [...runningWorkout, ...cyclingWorkout];
      this._insertCard();
    })
  }

  _insertCard() {
    this.#workouts.forEach(work => {
      //updating localstorage
      localStorage.setItem('workouts', JSON.stringify(this.#workouts));

      // updating html
      const pick = document.querySelector(`[data-id="${work.id}"]`);
      pick.parentElement.removeChild(pick);
      sort__devider.insertAdjacentElement('afterend', pick);
    });
  }
}

const app = new App();

