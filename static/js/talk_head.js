// Функция воспроизведения заданной фразы мужским голосом
function speak(text, callback) {
    const utterance = new SpeechSynthesisUtterance(text);

    // Получаем список доступных голосов
    const voices = speechSynthesis.getVoices();
	console.log(voices);

    // Если голоса ещё не загружены, назначим отложенный вызов
    if (!voices.length) {
        window.speechSynthesis.onvoiceschanged = () => {
            speak(text, callback);
        };
        return;
    }

    // Пробуем выбрать мужской голос на русском языке
    const maleVoice = voices.find(v => v.name.toLowerCase().includes('русский') && v.lang.startsWith('ru'));
    if (maleVoice) {
        utterance.voice = maleVoice;
    } else {
        // Если мужского голоса нет, выбираем любой голос на русском языке
        const russianVoice = voices.find(v => v.lang.startsWith('ru'));
        if (russianVoice) {
            utterance.voice = russianVoice;
        }
    }

    utterance.lang = 'ru-RU';

    // Вызываем callback после завершения воспроизведения
    utterance.onend = () => {
        if (callback) callback();
    };

    window.speechSynthesis.speak(utterance);
}

// Функция отправки GET запроса
async function fetchResponse(userText) {
    const encodedText = encodeURIComponent(userText);
    const url = "https://text.pollinations.ai/{" + encodedText + "}";
    let retries = 3; // Количество попыток

    while (retries > 0) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'text/plain;',
                    'Accept': 'text/plain;'
                }
            });

            if (response.ok) {
                const responseText = await response.text();
                return responseText;
            } else {
                console.error('Ошибка запроса:', response.status, response.statusText);
                retries--;
                await new Promise(resolve => setTimeout(resolve, 2000)); // Задержка 2 секунды
            }
        } catch (error) {
            console.error('Ошибка при выполнении запроса:', error);
            retries--;
            await new Promise(resolve => setTimeout(resolve, 2000)); // Задержка 2 секунды
        }
    }

    return null; // Если все попытки неудачны
}

// Основная функция обработки клика
let recognizer; // Глобальная переменная для распознавателя
let isListening = false; // Флаг для проверки состояния прослушивания
let isStarting = false; // Флаг для предотвращения одновременного вызова start()

function handleInteraction() {
    if (!isListening) {
        startListening();
    } else {
        stopListening();
    }
}

function startListening() {
    const SpeechRecognition = window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Ваш браузер не поддерживает API распознавания речи. Попробуйте использовать Chrome или Edge.");
        return;
    }

    // Создаем новый экземпляр распознавателя
    recognizer = new SpeechRecognition();
    console.log(speechSynthesis.getVoices());
    recognizer.continuous = true; // Включаем непрерывное распознавание
    recognizer.interimResults = false; // Запрещаем промежуточные результаты
    recognizer.lang = 'ru-RU'; // Устанавливаем язык

    // Говорим "Я слушаю, пожалуйста говорите"
    speak("Я слушаю, пожалуйста говорите", () => {
        // Начинаем слушать после завершения воспроизведения
        if (!isStarting) {
            isStarting = true;
            recognizer.start();
            isListening = true;
            isStarting = false;
        }
    });

    // Обработка результатов распознавания
    recognizer.onresult = function (event) {
        const result = event.results[event.resultIndex];
        if (result.isFinal) {
            const userText = result[0].transcript.trim();
            console.log('Вы сказали:', userText);

            // Отправляем текст на сервер и получаем ответ
            fetchResponse(userText).then(responseText => {
                if (responseText) {
                    console.log('Ответ сервера:', responseText);
                    speak(responseText); // Озвучиваем ответ
                } else {
                    speak("Извините, я не смог получить ответ.");
                }
            });
        }
    };

    // Обработка завершения распознавания
    recognizer.onend = function () {
        console.log("Распознавание завершилось.");
        if (isListening) {
            console.log("Перезапускаем...");
            if (!isStarting) {
                isStarting = true;
                recognizer.start();
                isStarting = false;
            }
        }
    };

    // Обработка ошибок
    recognizer.onerror = function (event) {
        console.error('Ошибка распознавания:', event.error);
        if (event.error === "no-speech") {
            console.log("Речь не обнаружена. Попробуйте снова.");
        } else if (event.error === "network") {
            console.log(event.error);
            console.error("Сетевая ошибка. Проверьте подключение к интернету.");
        }

        // Перезапускаем распознавание только если isListening == true
        if (isListening && !isStarting) {
            isStarting = true;
            recognizer.start();
            isStarting = false;
        }
    };
}

function stopListening() {
    if (recognizer) {
        recognizer.stop();
        isListening = false;
        speak("Слушание завершено.");
    }
}

// Назначение обработчика клика на оба элемента
document.getElementById('clickableImage')?.addEventListener('click', handleInteraction);
document.getElementById('clickableContainer')?.addEventListener('click', handleInteraction);
document.getElementById('clickable_mini_Image')?.addEventListener('click', handleInteraction);
document.getElementById('clickable_mini_Container')?.addEventListener('click', handleInteraction);