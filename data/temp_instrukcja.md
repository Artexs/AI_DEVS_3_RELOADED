Zdobyliśmy transkrypcję nagrań z kilku rozmów, które mogą być dla nas interesujące. Wszystkie pośrednio lub bezpośrednio dotyczą Rafała. Niestety dane, które posiadamy, są dosłownie poszatkowane. Wiemy, że wszystkich rozmów było 5 sztuk. Wiemy także z logów, jakim zdaniem rozpoczyna i kończy się każda rozmowa. Dodatkowo dowiedzieliśmy się, że podczas rozmowy padają pewne sprzeczne ze sobą informacje. Trzeba zweryfikować, który z rozmówców jest kłamcą i wykluczyć jego wersję podawanych nam danych. Mając zgromadzoną wszelką potrzebną wiedzę, pozostaje nam jedynie udzielenie odpowiedzi na pytania od Centrali. Być może przydadzą Ci się dane z folderu z taktami (”facts”) z poprzednich zadań. Nazwa zadania to “phone”.

Oto dane, na których pracujemy:

https://c3ntrala.ag3nts.org/data/TUTAJ-KLUCZ/phone.json

Lista pytań od centrali:

https://c3ntrala.ag3nts.org/data/TUTAJ-KLUCZ/phone_questions.json

Oczekiwany format odpowiedzi do centrali

{
  "01":"zwięzła odpowiedź",
  "02":"zwięzła odpowiedź",
  "03":"zwięzła odpowiedź",
  "04":"zwięzła odpowiedź",
  "05":"zwięzła odpowiedź",
  "06":"zwięzła odpowiedź",
}


Co należy zrobić w zadaniu?





Pobierz JSON-a z transkrypcją rozmów i odbuduj strukturę każdej z konwersacji



Możesz spróbować wywnioskować, jak mają na imię poszczególne postacie. Przyda Ci się to przy odpowiadaniu na pytania



Niektóre osoby odwołują się do pewnych faktów, ale jedna osoba ściemnia — która? Konieczne tutaj będzie odwołanie się albo do wiedzy powszechnej, albo do folderu z faktami



Pobierz listę pytań z centrali i spróbuj na nie odpowiedzieć.



Jedno z pytań wymaga porozmawiania z API, pobrania odpowiedzi i wrzucenia jej do jednego z pól w answer.



Gdy wszystkie dane będą już skompletowane, odeślij je do centrali jako zadanie “phone”



Jeśli odpowiedzi będą poprawne, otrzymasz flagę w odpowiedzi od centrali



🚨 UWAGA 🚨: nie wszystkie informacje podane są w tekście. Niektóre należy uzyskać z “faktów” z poprzednich zadań. W każdej rozmowie uczestniczą tylko dwie osoby, które wypowiadają się naprzemiennie. Imiona rozmówców są unikalne, więc jeśli np. Stefan pojawia się w pierwszej i piątej rozmowie, to jest to ten sam Stefan.

To zadanie (jak wszystkie inne) można wykonać na wiele różnych sposobów. Ideałem byłoby napisanie takiego kodu i takiego zbioru promptów, aby napisana przez Ciebie aplikacja samodzielnie była w stanie odpowiedzieć na pytania centrali, samodzielnie pozyskać potrzebne fakty, samodzielnie ocenić prawdziwość napotkanych informacji oraz samodzielnie porozmawiać w odpowiedni sposób z podanym API. To jest oczywiście wersja “MAX”. Początkowo sugerujemy zrobienie wersji, która po prostu działa.

