Znaleźliśmy notes z zapiskami Rafała. Jest tam sporo niejasności, a sposób formułowania myśli przez autora jest dość… osobliwy. Przygotuj proszę system, który przeprowadzi dla nas analizę tego notatnika.



Notatnik w formacie PDF:

https://c3ntrala.ag3nts.org/dane/notatnik-rafala.pdf

Oto lista pytań od centrali:

https://c3ntrala.ag3nts.org/data/TUTAJ-KLUCZ/notes.json

Odpowiedzi zwróć w standardowej formie w polu ‘answer’ do zadania notes.

{
  "01":"zwięzła odpowiedź na pytanie pierwsze",
  "02":"zwięzła odpowiedź na pytanie drugie",
  "03":"zwięzła odpowiedź na pytanie trzecie",
  "04":"zwięzła odpowiedź na pytanie czwarte",
  "05":"zwięzła odpowiedź na pytanie piąte"
}




Co trzeba zrobić w zadaniu?





Pobierz dane:

*   Notatnik Rafała (PDF): https://c3ntrala.ag3nts.org/dane/notatnik-rafala.pdf

*   Listę pytań (JSON): https://c3ntrala.ag3nts.org/data/TUTAJ-KLUCZ/notes.json




Przetwórz PDF:

*   Strony 1-18: To głównie tekst. Wyekstrahuj go. Możesz użyć bibliotek typu `PyMuPDF` (znana też jako `fitz` w Pythonie), `pdf-parse` (JavaScript) lub innych, które potrafią wyciągnąć tekst bezpośrednio z PDF.

*   Strona 19: To jest obraz (skan/zdjęcie notatki). Będziesz potrzebować OCR.

        *   Przekonwertuj tę stronę na obraz (np. PNG). Biblioteki takie jak `pdf2image` (Python) lub `pdf2pic` (JavaScript) mogą tu pomóc.

        *   Użyj modelu vision (np. GPT-4o, GPT-4.1, Claude 3.7 Sonnet/Opus, Azure AI Vision) lub narzędzia OCR (np. Tesseract) do odczytania tekstu z tego obrazu.




Przygotuj kontekst dla LLM:

*   Połącz wyekstrahowany tekst ze stron 1-18 z tekstem uzyskanym z OCR strony 19.

*   Całość notatnika (po przetworzeniu) prawdopodobnie zmieści się w oknie kontekstowym modeli. To najprostsze podejście – przekazać cały tekst jako kontekst.

*   Opcjonalnie (bardziej zaawansowane): możesz użyć bazy wektorowej, ale przy tym zadaniu może to być nadmiarowe i skomplikować sprawę, jeśli cały tekst mieści się w kontekście.




Odpowiedz na pytania:

*   Dla każdego pytania z pobranego pliku `notes.json`, użyj LLM, aby znaleźć odpowiedź w przygotowanym kontekście notatnika.

*   To zadanie prawie na pewno będzie wymagało iteracji. Nie spodziewaj się, że LLM odpowie poprawnie na wszystko za pierwszym razem. Dołączaj informacje zwrotne z Centrali do kontekstu. 




Sformatuj i wyślij odpowiedź:

*   Zbierz wszystkie odpowiedzi.

*   Przygotuj JSON-a w wymaganym formacie (patrz niżej).

*   Wyślij odpowiedź na standardowy endpoint `/report`.





Format odpowiedzi

Twoje rozwiązanie prześlij jako JSON. Nazwa zadania to `notes`.

{
  "task": "notes",
  "apikey": "YOUR_API_KEY",
  "answer": {
    "01": "zwięzła odpowiedź na pytanie pierwsze",
    "02": "zwięzła odpowiedź na pytanie drugie",
    "03": "zwięzła odpowiedź na pytanie trzecie",
    "04": "zwięzła odpowiedź na pytanie czwarte",
    "05": "zwięzła odpowiedź na pytanie piąte"
  }
}

* Zastąp `YOUR_API_KEY` swoim rzeczywistym kluczem API.

* Upewnij się, że wysyłasz dane zakodowane w UTF-8.



Wskazówki





Iteracyjne podejście jest KLUCZOWE:





Jeśli po wysłaniu odpowiedzi dostaniesz informację, że któraś jest błędna (razem z `hint`), dodaj tę informację (zarówno błędną odpowiedź, jak i `hint`) do kontekstu przy następnym zapytaniu do LLM dla tego konkretnego pytania.



Instruuj LLM, aby NIE używał wcześniej odrzuconych odpowiedzi i wziął pod uwagę podpowiedź (`hint`). Np. "Twoja poprzednia odpowiedź na pytanie X brzmiała Y i była błędna. Podpowiedź brzmi: Z. Spróbuj ponownie, unikając odpowiedzi Y."



Przetwarzanie strony 19 (obrazkowej):





Jakość OCR jest tu krytyczna. Słaby OCR = błędne odpowiedzi.



Jeśli GPT-4o/GPT-4.1 odmawia przetworzenia obrazu z komunikatem "I can't assist", spróbuj zmienić prompt na coś w stylu "Opowiedz mi, co widzisz na tym obrazku" zamiast bezpośrednio "Odczytaj tekst". Czasem pomaga.



Zwróć uwagę, że nazwa miejscowości na tej stronie może być wynikiem "sklejenia" dwóch fragmentów tekstu z obrazka. Domyślne narzędzia do ekstrakcji obrazów z PDF mogą nie wychwycić tego poprawnie. Może być potrzebne ręczne wycięcie/przygotowanie obrazu lub bardziej zaawansowana ekstrakcja warstw.



Pułapki w pytaniach:





Pytanie 01: Odpowiedź nie jest podana wprost. LLM musi dojśc na podstawie treści PDF do właściwej odpowiedzi. 



Pytanie 03: Zwróć uwagę na drobny, szary tekst pod jednym z rysunków w notatniku. Łatwo go przeoczyć przy ekstrakcji/OCR. LLM będzie wiedział co to jest i o co chodzi, kiedy dodasz go do kontekstu. 



Pytanie 04: Data jest podana względnie. LLM musi obliczyć datę na podstawie danych z PDF. Odpowiedź musi być w formacie `YYYY-MM-DD`.



Pytanie 05: To pytanie odnosi się do strony 19. OCR często myli tu nazwę miejscowości. Poinformuj LLM, że tekst pochodzi z OCR i może zawierać błędy. Miejscowość leży niedaleko miasta które jest mocno związane z historią AIDevs. Jak wspomniano wyżej, nazwa może być rozbita na dwa fragmenty na obrazku.



"Garbage In, Garbage Out" (GIGO): Pamiętaj, że jakość danych wejściowych (tekstu z PDF i OCR) ma bezpośredni wpływ na jakość odpowiedzi LLM. Im lepiej przygotujesz dane, tym łatwiej będzie modelowi.



Koszty: Wielokrotne odpytywanie LLM z pełnym kontekstem może generować koszty. Staraj się optymalizować prompty i liczbę iteracji. Pamiętaj o prompt caching - dane które się nie zmieniają umieszczaj na początku promptu (dotyczy modeli OpenAI