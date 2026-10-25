
const searchForm = document.getElementById("search-form");
const wordInput = document.getElementById("word-input");
const searchButton = document.getElementById("search-button");
const statusMessage = document.getElementById("status-message");
const wordResult = document.getElementById("word-result");
const wordTitle = document.getElementById("word-title");
const phonetic = document.getElementById("phonetic");
const definitionsContainer = document.getElementById("definitions");
const synonymsContainer = document.getElementById("synonyms");
const audioButton = document.getElementById("audio-button");
const favoriteButton = document.getElementById("favorite-button");
const favoritesList = document.getElementById("favorites-list");
const favoritesEmpty = document.getElementById("favorites-empty");
const themeToggle = document.getElementById("theme-toggle");

let currentWord = "";
let currentAudio = "";
let favorites = loadFavorites();

// Load saved favorites safely.
function loadFavorites() {
  try {
    const saved = localStorage.getItem("wordly-favorites");
    const parsed = saved ? JSON.parse(saved) : [];

    return Array.isArray(parsed)
      ? parsed.filter(
          (word) => typeof word === "string" && word.trim() !== ""
        )
      : [];
  } catch (error) {
    return [];
  }
}

// Display loading messages and errors.
function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

// Fetch a word from the Free Dictionary API.
async function searchWord(word) {
  const cleanedWord = word.trim();

  if (!cleanedWord) {
    showStatus("Please enter a word to search.", true);
    return;
  }

  currentWord = "";
  currentAudio = "";
  wordResult.hidden = true;
  audioButton.hidden = true;
  searchButton.disabled = true;
  searchButton.textContent = "Searching...";

  showStatus(`Searching for "${cleanedWord}"...`);

  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanedWord)}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Sorry, "${cleanedWord}" was not found.`);
      }

      throw new Error("Unable to contact the dictionary. Please try again.");
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("No dictionary results were found.");
    }

    displayWord(data[0]);
    showStatus("");
  } catch (error) {
    showStatus(
      error instanceof TypeError
        ? "Network error. Check your internet connection and try again."
        : error.message || "Something went wrong. Please try again.",
      true
    );
  } finally {
    searchButton.disabled = false;
    searchButton.textContent = "Search";
  }
}

// Display the dictionary result.
function displayWord(entry) {
  currentWord = entry.word.toLowerCase();

  wordTitle.textContent = entry.word;
  phonetic.textContent = entry.phonetic || "Pronunciation unavailable";

  definitionsContainer.replaceChildren();
  synonymsContainer.replaceChildren();

  // Find available pronunciation audio.
  const phonetics = entry.phonetics || [];
  const audioEntry = phonetics.find(
    (item) => item.audio && item.audio.trim() !== ""
  );

  currentAudio = audioEntry ? audioEntry.audio : "";
  audioButton.hidden = !currentAudio;

  // Display meanings, definitions, examples, and synonyms.
  const allSynonyms = new Set();

  (entry.meanings || []).forEach((meaning) => {
    const card = document.createElement("article");
    card.className = "definition-card";

    const partOfSpeech = document.createElement("h3");
    partOfSpeech.textContent = meaning.partOfSpeech || "Meaning";

    const definitionList = document.createElement("ol");

    (meaning.definitions || []).forEach((item) => {
      const listItem = document.createElement("li");
      listItem.append(document.createTextNode(item.definition));

      if (item.example) {
        const example = document.createElement("span");
        example.className = "example";
        example.textContent = `Example: "${item.example}"`;
        listItem.appendChild(example);
      }

      definitionList.appendChild(listItem);
    });

    card.append(partOfSpeech, definitionList);
    definitionsContainer.appendChild(card);

    (meaning.synonyms || []).forEach((word) => {
      allSynonyms.add(word);
    });

    (meaning.definitions || []).forEach((item) => {
      (item.synonyms || []).forEach((word) => {
        allSynonyms.add(word);
      });
    });
  });

  // Display synonyms as clickable search buttons.
  if (allSynonyms.size === 0) {
    synonymsContainer.textContent = "No synonyms available.";
  } else {
    [...allSynonyms].slice(0, 20).forEach((synonym) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "synonym";
      button.textContent = synonym;
      button.addEventListener("click", () => {
        wordInput.value = synonym;
        searchWord(synonym);
      });

      synonymsContainer.appendChild(button);
    });
  }

  updateFavoriteButton();
  wordResult.hidden = false;
}

// Play pronunciation audio.
audioButton.addEventListener("click", () => {
  if (!currentAudio) return;

 const audio = new Audio(currentAudio);

audio.addEventListener("error", () => {
  showStatus("Audio file could not be loaded. Please try another word.", true);
});

audio.play().catch((error) => {
  console.error("Audio playback error:", error);
  showStatus("Audio could not play. Check the browser Console.", true);
});
});

// Save or remove the current word from favorites.
favoriteButton.addEventListener("click", () => {
  if (!currentWord) return;

  const index = favorites.indexOf(currentWord);

  if (index === -1) {
    favorites.push(currentWord);
    showStatus(`"${currentWord}" added to favorites.`);
  } else {
    favorites.splice(index, 1);
    showStatus(`"${currentWord}" removed from favorites.`);
  }

  saveFavorites();
  renderFavorites();
  updateFavoriteButton();
});

// Update the favorite button text.
function updateFavoriteButton() {
  const isFavorite = favorites.includes(currentWord);

  favoriteButton.textContent = isFavorite
    ? "★ Remove from favorites"
    : "☆ Save to favorites";
}

// Save favorites in the browser.
function saveFavorites() {
  try {
    localStorage.setItem("wordly-favorites", JSON.stringify(favorites));
  } catch (error) {
    showStatus("Favorites could not be saved in this browser.", true);
  }
}

// Render the favorites list.
function renderFavorites() {
  favoritesList.replaceChildren();
  favoritesEmpty.hidden = favorites.length > 0;

  favorites.forEach((word) => {
    const item = document.createElement("li");

    const wordButton = document.createElement("button");
    wordButton.type = "button";
    wordButton.className = "favorite-word";
    wordButton.textContent = word;

    wordButton.addEventListener("click", () => {
      wordInput.value = word;
      searchWord(word);
    });

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-favorite";
    removeButton.textContent = "Remove";
    removeButton.setAttribute("aria-label", `Remove ${word} from favorites`);

    removeButton.addEventListener("click", () => {
      favorites = favorites.filter((favorite) => favorite !== word);
      saveFavorites();
      renderFavorites();
      updateFavoriteButton();
    });

    item.append(wordButton, removeButton);
    favoritesList.appendChild(item);
  });
}

// Switch between light and dark themes.
themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark-mode");

  themeToggle.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";

  try {
    localStorage.setItem("wordly-theme", isDark ? "dark" : "light");
  } catch (error) {
    // Theme switching still works if storage is unavailable.
  }
});

// Restore the user's preferred theme.
try {
  const savedTheme = localStorage.getItem("wordly-theme");

  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    themeToggle.textContent = "☀️ Light Mode";
  }
} catch (error) {
  // Use the default light theme.
}

// Handle form submission without refreshing the page.
searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  searchWord(wordInput.value);
});

// Show saved favorites when the app opens.
renderFavorites();
