let currentPage = 1;
const pageSize = 12;
let totalDogs = 0;
let favoriteDogs = new Set();

// Login handling
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;

  try {
    const response = await fetch('https://frontend-take-home-service.fetch.com/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email })
    });

    if (response.ok) {
      document.getElementById('login-section').style.display = 'none';
      document.getElementById('search-section').style.display = 'block';
      loadBreeds();
      searchDogs();
    } else {
      alert('Login failed. Please try again.');
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('Login failed. Please try again.');
  }
});

// Logout handling
document.getElementById('logout-btn').addEventListener('click', async () => {
  try {
    await fetch('/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('search-section').style.display = 'none';
  } catch (error) {
    console.error('Logout error:', error);
  }
});

// Load breeds for filter
async function loadBreeds() {
  try {
    const response = await fetch('https://frontend-take-home-service.fetch.com/dogs/breeds', {
      credentials: 'include'
    });
    const breeds = await response.json();
    const breedSelect = document.getElementById('breed-filter');
    breeds.forEach(breed => {
      const option = document.createElement('option');
      option.value = breed;
      option.textContent = breed;
      breedSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading breeds:', error);
  }
}

// Search dogs
async function searchDogs() {
  const breed = document.getElementById('breed-filter').value;

  const zipCode = document.getElementById('location-filter').value;
  const minAge = document.getElementById('min-age').value;
  const maxAge = document.getElementById('max-age').value;
  const sortOrder = document.getElementById('sort-order').value;

  try {
    // Calculate the 'from' cursor based on current page
    const from = (currentPage - 1) * pageSize;

    // Build query parameters
    let queryParams = `size=${pageSize}&from=${from}`;
    if (breed && breed !== 'Select Breed') queryParams += `&breeds=${[breed]}`;
    if (zipCode) queryParams += `&zipCodes=${[zipCode]}`;
    if (minAge) queryParams += `&ageMin=${minAge}`;
    if (maxAge) queryParams += `&ageMax=${maxAge}`;
    queryParams += `&sort=breed:${sortOrder}`;

    // First get the dog IDs
    const searchResponse = await fetch(`https://frontend-take-home-service.fetch.com/dogs/search?${queryParams}`, {
      credentials: 'include'
    });
    const searchData = await searchResponse.json();

    // Then fetch the actual dog details
    const dogsResponse = await fetch('https://frontend-take-home-service.fetch.com/dogs', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(searchData.resultIds)
    });
    const dogs = await dogsResponse.json();

    displayDogs(dogs);
    updatePagination(searchData.total);
  } catch (error) {
    console.error('Search error:', error);
  }
}

// Display dogs in grid
function displayDogs(dogs) {
  const grid = document.getElementById('dogs-grid');
  grid.innerHTML = '';

  dogs.forEach(dog => {
    const card = document.createElement('div');
    card.className = 'dog-card';
    const isFavorite = favoriteDogs.has(dog.id);
    card.innerHTML = `
      <img src="${dog.img}" alt="${dog.name}">
      <h3>${dog.name}</h3>
      <p>Breed: ${dog.breed}</p>
      <p>Age: ${dog.age} years</p>
      <p>Location: ${dog.zip_code}</p>
      <button class="favorite-btn ${isFavorite ? 'favorited' : ''}" data-id="${dog.id}">
        ${isFavorite ? '❤️ Remove' : '🤍 Favorite'}
      </button>
    `;
    
    const favBtn = card.querySelector('.favorite-btn');
    favBtn.addEventListener('click', () => toggleFavorite(dog.id, favBtn));
    
    grid.appendChild(card);
  });
}

function toggleFavorite(dogId, button) {
  if (favoriteDogs.has(dogId)) {
    favoriteDogs.delete(dogId);
    button.textContent = '🤍 Favorite';
    button.classList.remove('favorited');
  } else {
    favoriteDogs.add(dogId);
    button.textContent = '❤️ Remove';
    button.classList.add('favorited');
  }
  updateMatchButton();
  updateFavoritesDisplay();
}

async function updateFavoritesDisplay() {
  if (favoriteDogs.size === 0) {
    document.getElementById('favorites-grid').innerHTML = '<p style="color: white; grid-column: 1/-1; text-align: center;">No favorited dogs yet!</p>';
    return;
  }

  try {
    const response = await fetch('https://frontend-take-home-service.fetch.com/dogs', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([...favoriteDogs])
    });
    
    const favoritedDogs = await response.json();
    const grid = document.getElementById('favorites-grid');
    grid.innerHTML = '';

    favoritedDogs.forEach(dog => {
      const card = document.createElement('div');
      card.className = 'dog-card';
      card.innerHTML = `
        <img src="${dog.img}" alt="${dog.name}">
        <h3>${dog.name}</h3>
        <p>Breed: ${dog.breed}</p>
        <p>Age: ${dog.age} years</p>
        <p>Location: ${dog.zip_code}</p>
        <button class="favorite-btn favorited" onclick="toggleFavorite('${dog.id}', this)">❤️ Remove</button>
      `;
      grid.appendChild(card);
    });
  } catch (error) {
    console.error('Error updating favorites:', error);
  }
}

async function generateMatch() {
  if (favoriteDogs.size === 0) {
    alert('Please favorite some dogs first!');
    return;
  }

  try {
    const response = await fetch('https://frontend-take-home-service.fetch.com/dogs/match', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([...favoriteDogs])
    });
    
    const matchData = await response.json();
    
    // Fetch the matched dog's details
    const dogResponse = await fetch('https://frontend-take-home-service.fetch.com/dogs', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([matchData.match])
    });
    
    const [matchedDog] = await dogResponse.json();
    showMatch(matchedDog);
  } catch (error) {
    console.error('Match error:', error);
    alert('Error generating match. Please try again.');
  }
}

function showMatch(dog) {
  const modal = document.createElement('div');
  modal.className = 'match-modal';
  modal.innerHTML = `
    <div class="match-content">
      <h2>🎉 It's a Match! 🎉</h2>
      <img src="${dog.img}" alt="${dog.name}">
      <h3>${dog.name}</h3>
      <p>Breed: ${dog.breed}</p>
      <p>Age: ${dog.age} years</p>
      <p>Location: ${dog.zip_code}</p>
      <button onclick="this.closest('.match-modal').remove()">Close</button>
    </div>
  `;
  document.body.appendChild(modal);
}

function updateMatchButton() {
  const matchBtn = document.getElementById('generate-match');
  if (matchBtn) {
    matchBtn.disabled = favoriteDogs.size === 0;
  }
}

// Update pagination
function updatePagination(total) {
  totalDogs = total;
  const totalPages = Math.ceil(total / pageSize);
  document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages}`;
  document.getElementById('prev-page').disabled = currentPage === 1;
  document.getElementById('next-page').disabled = currentPage === totalPages;
}

// Event listeners for filters and pagination
document.getElementById('breed-filter').addEventListener('change', () => {
  currentPage = 1;
  searchDogs();
});

document.getElementById('sort-order').addEventListener('change', () => {
  currentPage = 1;
  searchDogs();
});


document.getElementById('location-filter').addEventListener('input', () => {
  currentPage = 1;
  searchDogs();
});

document.getElementById('min-age').addEventListener('input', () => {
  currentPage = 1;
  searchDogs();
});

document.getElementById('max-age').addEventListener('input', () => {
  currentPage = 1;
  searchDogs();
});

document.getElementById('prev-page').addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    searchDogs();
  }
});

document.getElementById('next-page').addEventListener('click', () => {
  if (currentPage < Math.ceil(totalDogs / pageSize)) {
    currentPage++;
    searchDogs();
  }
});

document.getElementById('generate-match').addEventListener('click', generateMatch);