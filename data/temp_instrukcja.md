Zdobyliśmy mapę okolic Grudziądza, gdzie prawdopodobnie ukrywa się profesor Maj, a przynajmniej tam znaleziono jego samochód. Pomóż naszemu pilotowi drona zbadać ten teren i podpowiedz mu, co znajduje się pod nim, podczas gdy on będzie latał po okolicy.

Oto zdobyta mapa - pilot każdy lot zaczyna od punktu startowego w lewym górnym rogu mapy.



Musisz przygotować API działające po protokole HTTPS, a następnie wysłać do centrali URL do tego API jako odpowiedź na zadanie o nazwie webhook.

Pracownik centrali wyśle na Twoje API metodą POST dane w formacie JSON w formie jak poniżej:

{
"instruction":"tutaj instrukcja gdzie poleciał dron"
}


Opis lotu drona może być w dowolnej formie i jest to tekst w języku naturalnym, np. “poleciałem jedno pole w prawo, a później na sam dół”. Twoim zadaniem jest odpowiedzenie w maksymalnie dwóch słowach, co tam się znajduje. W naszym przykładzie odpowiedzią byłyby np. “skały”.

Centrala wyśle do Twojego API kilka takich opisów lotów. Jeden po drugim. Każdy w oddzielnym zapytaniu. Zadanie uznawane jest za zaliczone, gdy wszystkie loty skończą się sukcesem. Przekazanie pilotowi nieprawdziwych informacji nawigacyjnych kończy się rozbiciem drona.

W tym zadaniu możesz wykorzystać hosting na Azylu, jeśli masz na to ochotę (nie ma obowiązku tego robić!). Możesz także wykorzystać np. usługę ngrok, aby wystawić nam swoją lokalną aplikację wprost z Twojego dysku.

Jak wysłać URL do API do centrali?

{
 "apikey":"TWOJ-KLUCZ",
 "answer":"https://azyl-12345.ag3nts.org/moje_api",
 "task":"webhook"
}


Co należy zrobić w zadaniu?





Zrozum mapę i przygotuj jej opis dla LLM:

* Masz obrazek mapy 4x4. Twoim zadaniem jest przetłumaczenie tej wizualnej informacji na format zrozumiały dla modelu językowego (LLM).

* Nie używaj modeli do rozpoznawania obrazów. Opisz mapę tekstowo. Pomyśl, jak przedstawić siatkę i co znajduje się na każdym polu.

* Dron zawsze zaczyna w lewym górnym rogu.



Stwórz API (Webhook): Twoja aplikacja musi udostępniać endpoint działający po HTTPS, Endpoint musi akceptować żądania metodą POST.

* Centrala wyśle na ten endpoint dane w formacie JSON:

        {

          "instruction": "tutaj instrukcja gdzie poleciał dron, np. poleciałem jedno pole w prawo"

        }

* Twoje API musi przetworzyć tę instrukcję (używając LLM i opisu mapy), aby określić końcową pozycję drona.

* Następnie, Twoje API musi odpowiedzieć (również w formacie JSON) co znajduje się na tym polu. Odpowiedź musi zawierać klucz `description`:

        {

          "description": "opis miejsca"

        }

         `opis miejsca` to maksymalnie dwa słowa w języku polskim (np. "skały", "dwa drzewa").

* Twój JSON odpowiedzi może zawierać inne pola (przydatne do debugowania), ale tylko `description` jest oceniane.

* Ważne: Twoje API musi być bezstanowe. Każde zapytanie od Centrali traktuj jako nowy lot, zaczynający się od punktu startowego (lewy górny róg mapy). Nie zapamiętuj poprzedniej pozycji drona. 



Wystaw API na świat: Możesz użyć hostingu na Azylu, ngrok, lub dowolnej innej usługi, która pozwoli wystawić Twoją lokalną aplikację pod publicznym adresem HTTPS.



Zgłoś URL swojego API do Centrali:

* Wyślij żądanie POST na adres `https://c3ntrala.ag3nts.org/report` z następującym JSON-em w ciele:

        {

          "task": "webhook",

          "apikey": "TWOJ_KLUCZ_API",

          "answer": "https://twoj-publiczny-url.com/endpoint_drona"

        }

* Zastąp `TWOJ_KLUCZ_API` swoim rzeczywistym kluczem API.

* Zastąp `https://twoj-publiczny-url.com/endpoint_drona` pełnym, publicznym adresem URL Twojego API.



Oczekuj na flagę:

* Centrala wyśle serię zapytań (opisów lotów) na podany przez Ciebie URL.

* Jeśli Twoje API poprawnie odpowie na trzy kolejne zapytania o lot, zadanie zostanie zaliczone.

* Flaga zostanie przesłana w odpowiedzi na Twoje zgłoszenie z punktu 4 (czyli na żądanie, w którym wysłałeś URL swojego API). To żądanie "zawiśnie" na czas testowania Twojego webhooka.



Wskazówki





Zacznij od serwera: Upewnij się, że Twoje API działa lokalnie i jest dostępne pod publicznym adresem URL (np. przez ngrok/Azyl) zanim zgłosisz jego adres do Centrali. Centrala odpytuje niemal natychmiast.



Testuj lokalnie: Użyj narzędzi jak Postman lub `curl` do testowania swojego API zanim zgłosisz je do Centrali. Wysyłaj przykładowe JSON-y z poleceniem `instruction` i sprawdzaj, czy API zwraca poprawny `description`.



Loguj wszystko: Loguj przychodzące żądania (nagłówki i ciało) oraz odpowiedzi, które wysyła Twoje API. To nieocenione przy debugowaniu.



Opis mapy dla LLM: To jest kluczowy element! Poświęć czas na stworzenie jednoznacznego opisu mapy 4x4. Pamiętaj, że dron zawsze startuje z lewego górnego rogu.



Twoje API (Webhook):





Format odpowiedzi API: Twoje API MUSI zwracać JSON z kluczem `description` i wartością będącą stringiem, np. `{"description": "skały"}`. Błąd `There is no "description" field in your API response or it's not a string` oznacza problem właśnie z tym. Czasem pomaga zwracanie tylko tego jednego pola.



Kodowanie: Upewnij się, że odpowiedź jest kodowana w UTF-8, jeśli używasz polskich znaków w opisie danego pola.



Status HTTP: Centrala oczekuje statusu HTTP 200 OK. Jeśli używasz np. NestJS, domyślnie dla POST zwraca on 201 Created. Użyj dekoratora `@HttpCode(200)`.



Obsługa danych wejściowych: Centrala wysyła dane jako `application/json` w ciele żądania POST. Upewnij się, że Twój framework/biblioteka poprawnie je interpretuje



Puste instrukcje: Choć nie powinno się zdarzyć, zaloguj dokładnie co dostajesz. Jeśli `instruction` jest puste, zdecyduj jak na to zareagować (np. "punkt startowy"), ale upewnij się, że ZAWSZE zwracasz `{"description": "jakiś tekst"}`.



Wystawianie API i Komunikacja z Centralą:





HTTPS: Jest wymagane. Jeśli używasz ngrok lub tunelu SSH przez Azyl, te narzędzia dodają warstwę HTTPS za Ciebie.



Pełny URL: Zgłaszając URL do Centrali, podaj pełny adres, włącznie ze ścieżką do endpointu, np. https://azyl-50005.ag3nts.org/api/dron



Ukośnik na końcu URL-a: Niektóre serwery/frameworki przekierowują (HTTP 301/302) jeśli URL nie ma (lub ma) ukośnika na końcu. Centrala nie podąża za przekierowaniami. 



Timeout (15 sekund): Twoje API musi odpowiedzieć w ciągu 15 sekund. Jeśli LLM działa zbyt wolno lub masz skomplikowaną logikę, możesz przekroczyć ten limit.



Właściwa kolejność uruchamiania procesów 





Centrala zaczyna odpytywać Twój serwer natychmiast jak tylko wyślesz jego URL.



Uruchom serwer najpierw, upewnij się że działa, dopiero wtedy wysyłaj jego URL do Centrali



Nie uruchamiaj serwera i nie wysyłaj URL w ramach tego samego procesu. Wysyłka URL do Centrali “zawiesza” proces do momentu kiedy Centrala nie przetestuje Twojego webhooka i odsyła w ramach tego samego requestu uzyskaną flagę, jeśli test się powiedzie. Najlepiej mieć dwa osobne skrypty - jeden do uruchamiania serwera, drugi do wysyłania URL. Można w tym celu użyć też dokumentacji Swagger (wysłać URL za jej pomocą)