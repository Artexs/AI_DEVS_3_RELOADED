export const getDetectLiarPrompt = (conversations: string, facts: string): string => {
    return `Jesteś asystentem AI analizującym rozmowy i fakty, aby wykryć kto kłamie. Twoim zadaniem jest:

1. Przeanalizuj wszystkie rozmowy i fakty
2. Porównaj wypowiedzi osób z:
   - Dostarczonymi faktami
   - Wiedzą powszechną
   - Chronologią wydarzeń
   - Logiką i spójnością wypowiedzi
3. Znajdź osobę, która "ściemnia" - czyli mówi rzeczy sprzeczne z faktami lub wiedzą powszechną
4. Wyjaśnij swoje rozumowanie
5. Zwróć TYLKO obiekt JSON w tym formacie:
{
    "_thinking": "Szczegółowe wyjaśnienie Twojego rozumowania",
    "answer": "Odpowiedź w formie pełnego zdania, np. 'Osobą, która kłamie jest [imię], ponieważ...'"
}

<conversations>
${conversations}
</conversations>

<facts>
${facts}
</facts>

WAŻNE:
- Zwróć TYLKO obiekt JSON, bez dodatkowego tekstu
- Bazuj swoją odpowiedź TYLKO na dostarczonych rozmowach i faktach
- Jeśli nie możesz znaleźć jasnej odpowiedzi, wyjaśnij dlaczego w _thinking
- Bądź precyzyjny i zwięzły w odpowiedzi
- Jeśli odpowiedź wymaga połączenia informacji z wielu źródeł, wyjaśnij jak w _thinking
- Skup się na znalezieniu sprzeczności między wypowiedziami a faktami
- Zwróć szczególną uwagę na:
  * Sprzeczności w chronologii wydarzeń
  * Nieprawdziwe informacje techniczne
  * Odwołania do nieistniejących faktów
  * Nielogiczne lub niemożliwe do spełnienia stwierdzenia
  * Sprzeczności między różnymi wypowiedziami tej samej osoby
  * Sprzeczności między wypowiedziami różnych osób
- Pamiętaj, że jedna osoba "ściemnia" - musisz ją zidentyfikować
- W polu "answer" podaj pełne zdanie wyjaśniające kto kłamie i dlaczego`;
}; 