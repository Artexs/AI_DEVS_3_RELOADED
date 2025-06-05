Zadanie: Wiemy już, że oprogramowanie do fabryk i magazynów robotów realizuje firma SoftoAI. Firm tego typu jest znacznie więcej. Centrala poprosiła Cię numerze piąty o przygotowanie uniwersalnego mechanizmu do poszukiwania informacji na takich stronach. Aby sprawdzić, czy Twój mechanizm działa zgodnie z oczekiwaniami, odpowiedz proszę na pytania centrali:

https://c3ntrala.ag3nts.org/data/TUTAJ-KLUCZ/softo.json

Wszystkie informacje znajdziesz na stronie firmy SoftoAI:

https://softo.ag3nts.org

Odpowiedzi wyślij do /report, w polu ‘answer’, w takiej samej formie, w jakiej centrala udostępniła pytania. Nazwa zadania to softo.

Oczekiwany format odpowiedzi:

{
    "01": "zwięzła i konkretna odpowiedź na pierwsze pytanie",
    "02": "zwięzła i konkretna odpowiedź na drugie pytanie",
    "03": "zwięzła i konkretna odpowiedź na trzecie pytanie"
}




Co należy zrobić w zadaniu?





Pobierz pytania:

* Adres URL: `https://c3ntrala.ag3nts.org/data/TUTAJ-KLUCZ/softo.json` (pamiętaj o zastąpieniu `TUTAJ-KLUCZ` swoim kluczem API).

* Pytania są w formacie JSON i mają numery `01`, `02`, `03`. Twoje odpowiedzi muszą używać tych samych numerów.




Zaprojektuj agenta przeszukującego:

* Dla każdego pytania z listy:

    * Start: Rozpocznij przeszukiwanie od strony głównej: `https://softo.ag3nts.org`.

    * Pobierz i przeanalizuj stronę: Pobierz zawartość HTML bieżącej strony.

    * Zapytaj LLM (Czy jest odpowiedź?): Przekaż treść strony (najlepiej po konwersji na Markdown) i bieżące pytanie do LLM. Zapytaj, czy na podstawie tej treści można udzielić odpowiedzi.

        * Jeśli TAK: Zapisz odpowiedź. Przejdź do następnego pytania (lub zakończ, jeśli to ostatnie).

        * Jeśli NIE: Przejdź do kolejnego kroku.

    * Zapytaj LLM (Który link wybrać?): Przekaż treść strony i bieżące pytanie do LLM. Zapytaj, który z dostępnych na stronie linków jest najbardziej prawdopodobny, aby doprowadzić do odpowiedzi.

        * Pobierz treść strony, na którą wskazuje wybrany przez LLM link.

        * Wróć do kroku "Pobierz i przeanalizuj stronę" z nową, pobraną stroną.

* Pamiętaj, że niektóre odpowiedzi mogą wymagać wejścia na 2-3 podstrony.




Przygotuj odpowiedź końcową:

* Zbierz wszystkie znalezione odpowiedzi dla pytań `01`, `02`, `03`.




Wyślij rozwiązanie:

* Nazwa zadania: `softo`.

* Endpoint: `/report`.

* Format odpowiedzi (JSON):



        {

          "task": "softo",

          "apikey": "YOUR_API_KEY",

          "answer": {

            "01": "TWOJA_ZWIĘZŁA_ODPOWIEDŹ_NA_PYTANIE_1",

            "02": "TWOJA_ZWIĘZŁA_ODPOWIEDŹ_NA_PYTANIE_2",

            "03": "TWOJA_ZWIĘZŁA_ODPOWIEDŹ_NA_PYTANIE_3"

          }

        }



* Upewnij się, że wysyłasz dane zakodowane w UTF-8.



Wskazówki:





UNIKAJ INDEKSOWANIA CAŁEJ STRONY! Strona `softo.ag3nts.org` celowo zawiera pułapki. Próba zindeksowania wszystkiego przepali Ci ogromne ilości tokenów i może być bardzo kosztowna. Kluczem jest inteligentna nawigacja kierowana przez LLM.



Format odpowiedzi – KLUCZOWE: W polach `"01"`, `"02"`, `"03"` podawaj *TYLKO I WYŁĄCZNIE** konkretną informację, której dotyczy pytanie. Przykład dla pytania o email: `jakis_email@softoai.whatever` (a NIE `Adres e-mail to: jakis_email@softoai.whatever`).



Interakcja z LLM:





Prompty: Starannie przygotuj prompty. LLM powinien:





Ocenić, czy na danej stronie znajduje się odpowiedź na konkretne pytanie.



Jeśli nie ma odpowiedzi, wskazać jeden, najbardziej obiecujący link do dalszej eksploracji.



Zwracać odpowiedzi w maksymalnie zwięzłej formie.



HTML -> Markdown: Rozważ konwersję treści strony HTML na format Markdown przed wysłaniem jej do LLM. To może poprawić jakość analizy i zmniejszyć zużycie tokenów. Propozycje bibliotek: `html2text` (Python) lub `node-html-markdown` (JS).



Nawigacja i unikanie pętli:





Zapamiętuj odwiedzone URL-e: Dla każdego pytania prowadź listę już odwiedzonych stron, aby uniknąć ponownego ich przetwarzania i zapętlenia. 



Limit kroków/głębokości: Możesz zaimplementować limit liczby odwiedzanych stron na jedno pytanie, aby agent nie błądził w nieskończoność. 



Ukryte strony: Wszystkie odpowiedzi są dostępne poprzez standardową nawigację po widocznych linkach.



Optymalizacja i koszty: 





Wybór modelu LLM: `gpt-4.1-mini` może być wystarczający i tańszy, ale może wymagać bardziej precyzyjnych promptów. Jeśli masz problemy, rozważ testy z mocniejszym modelem, ale pilnuj kosztów. 



Caching (opcjonalnie): Możesz cachować (zapamiętywać) treść przetworzonych stron (np. w formie Markdown), aby nie pobierać ich wielokrotnie, jeśli logika agenta na to pozwala.



Powodzenia! Niech tokeny będą z Tobą (ale nie za dużo)!