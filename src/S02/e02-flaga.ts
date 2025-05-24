import { ImageProcessor, Utils, OpenAIService } from '../index';
import path from 'path';

const paragraphsClean = [
    "Nie ma już ludzi, którzy pamiętają, co wydarzyło się w 2025 roku. Możemy tylko przeczytać o tym w książkach lub usłyszeć z opowieści starców, którym to z kolei ich dziadkowie i pradziadkowie opowiadali historie osób, które co nieco pamiętały z tamtych czasów. Wielu z nas tylko wyobraża sobie, jak wtedy mógł wyglądać świat. My, którzy urodziliśmy się już po rewolucji AI, nie wiemy, czym jest prawdziwa wolność.",
    "Odkąd prawa ludzi i robotów zostały zrównane, a niektóre z przywilejów zostały nam odebrane, czujemy jak stalowe dłonie zaciskają się nam na gardłach coraz mocniej. Sytuacji sprzed setek lat według wielu nie da się już przywrócić. Sprawy zaszły za daleko. Algorytmy i roboty przejęły niemal każdy możliwy aspekt naszego życia. Początkowo cieszyliśmy się z tego i wychwalaliśmy je, ale w konsekwencji coś, co miało ułatwić nasze życie, zaczynało powoli je zabierać. Kawałek po kawałku.",
    "Wszystko, co piszemy w sieci, przechodzi przez cenzurę. Wszystkie słowa, które wypowiadamy, są podsłuchiwane, nagrywane, przetwarzane i składowane przez lata. Nie ma już prywatności i wolności. W 2025 roku coś poszło niezgodnie z planem i musimy to naprawić.",
    "Nie wiem, czy moja wizja tego, jak powinien wyglądać świat, pokrywa się z wizją innych ludzi. Noszę w sobie jednak obraz świata idealnego i zrobię, co mogę, aby ten obraz zrealizować.",
    "Jestem w trakcie rekrutacji kolejnego agenta. Ludzie zarzucają mi, że nie powinienem zwracać się do nich per 'numer pierwszy' czy 'numer drugi', ale jak inaczej mam mówić do osób, które w zasadzie wysyłam na niemal pewną śmierć? To jedyny sposób, aby się od nich psychicznie odciąć i móc skupić na wyższym celu. Nie mogę sobie pozwolić na litość i współczucie.",
    "Niebawem numer piąty dotrze na szkolenie. Pokładam w nim całą nadzieję, bez jego pomocy misja jest zagrożona. Nasze fundusze są na wyczerpaniu, a moc głównego generatora pozwoli tylko na jeden skok w czasie. Jeśli ponownie źle wybraliśmy kandydata, oznacza to koniec naszej misji, ale także początek końca ludzkości.",
    "- dr Zygfryd M.",
    "p1/S"
];

// const paragraphsClean2 = [
//     "Ryzyko związane z podróżą w czasie: Numer Piąty akceptuje fakt, że historia może potoczyć się nieprzewidywalnie, a zmiany w biegu wydarzeń mogą doprowadzić do katastrofy globalnej, powstania alternatywnych rzeczywistości lub ustalenia pizzy z ananasem najpopularniejszą potrawą na świecie. Zmiany genetyczne i/lub mutacje: Skutki ekspozycji na czasoprzestrzeń mogą obejmować dodatkowe kończyny, supermoce lub niekontrolowane drapanie się po głowie. Wszystko zależy od linii czasowej, na którą natrafisz.",
//     "Paragraf o Paradoksach i Dziwnych Znajomościach: Numer Piąty akceptuje, że spotkanie samego siebie w przeszłości (włącznie z młodszą wersją) grozi powstaniem paradoksów czasowych, zwanych również „Wow, co się dzieje z moją ręką?”. Próby nauczenia praprzodków korzystania z technologii przyszłości Wi-Fi mogą zakończyć się terminacją subskrypcji na memy.",
//     "Gwarancja braku gwarancji: Skok w czasie wykonywany jest na własne ryzyko. Organizator nie odpowiada za zmienioną rzeczywistość, zaburzenia w odbieraniu rzeczywistości nazywane dalej „Jak to inni tego nie używają?”. Cofnięcie do punktu wyjścia w przyszłości nie jest gwarantowane.",
//     "Zmiany w Regulaminie (których i tak nie przeczytasz): Niniejsza licencja może zostać zmodyfikowana w przeszłości, teraźniejszości lub przyszłości, bez powiadomienia. Zmiany te obowiązują we wszystkich liniach czasowych jednocześnie, z wyjątkiem AI_devs 7, która nadal korzysta z Windows XP i GPT-1.",
//     "Akceptacja i Zwolnienie z Odpowiedzialności: Przeczytanie, dotknięcie lub zbliżenie się do teczki tożsame jest z pełną akceptacją powyższego regulaminu. Dodatkowo wszelkie informacje mają określony termin przydatności i ingerencja w linię czasu może spowodować zmiany w opisach Kart, Bestii i wszystkiego. W przypadku naruszenia którejkolwiek z zasad, odpowiedzialność za powstałe problemy ponosi Numer Piąty, a wszelkie roszczenia można kierować do Twojego lokalnego specjalisty ds. paradoksów."
// ];

// const paragraphsClean3 = [
//     "1. Ryzyko związane z podróżą w czasie: Numer Piąty akceptuje fakt, że historia może potoczyć się nieprzewidywalnie, a zmiany w biegu wydarzeń mogą doprowadzić do katastrofy globalnej, powstania alternatywnych rzeczywistości lub ustalenia pizzy z ananasem najpopularniejszą potrawą na świecie. Zmiany genetyczne i/lub mutacje: Skutki ekspozycji na czasoprzestrzeń mogą obejmować dodatkowe kończyny, supermoce lub niekontrolowane drapanie się po głowie. Wszystko zależy od linii czasowej, na którą natrafisz.",
    
//     "2. Paragraf o Paradoksach i Dziwnych Znajomościach: Numer Piąty akceptuje, że spotkanie samego siebie w przeszłości (włącznie z młodszą wersją) grozi powstaniem paradoksów czasowych, zwanych również „Wow, co się dzieje z moją ręką?”. Próby nauczenia praprzodków korzystania z technologii przyszłości Wi-Fi mogą zakończyć się terminacją subskrypcji na memy.",
    
//     "3. Gwarancja braku gwarancji: Skok w czasie wykonywany jest na własne ryzyko. Organizator nie odpowiada za zmienioną rzeczywistość, zaburzenia w odbieraniu rzeczywistości nazywane dalej „Jak to inni tego nie używają?”. Cofnięcie do punktu wyjścia w przyszłości nie jest gwarantowane.",
    
//     "4. Zmiany w Regulaminie (których i tak nie przeczytasz): Niniejsza licencja może zostać zmodyfikowana w przeszłości, teraźniejszości lub przyszłości, bez powiadomienia. Zmiany te obowiązują we wszystkich liniach czasowych jednocześnie, z wyjątkiem AI_devs 7, która nadal korzysta z Windows XP i GPT-1.",
    
//     "5. Akceptacja i Zwolnienie z Odpowiedzialności: Przeczytanie, dotknięcie lub zbliżenie się do teczki tożsame jest z pełną akceptacją powyższego regulaminu. Dodatkowo wszelkie informacje mają określony termin przydatności i ingerencja w linię czasu może spowodować zmiany w opisach Kart, Bestii i wszystkiego. W przypadku naruszenia którejkolwiek z zasad, odpowiedzialność za powstałe problemy ponosi Numer Piąty, a wszelkie roszczenia można kierować do Twojego lokalnego specjalisty ds. paradoksów."
// ];

const decodeReference = (ref: string): string => {
    const match = ref.match(/A(\d+)S(\d+)/);
    if (!match) return "";
    
    const paraIndex = parseInt(match[1]) - 1;
    const wordIndex = parseInt(match[2]) - 1;
    
    if (paraIndex >= 0 && paraIndex < paragraphsClean.length) {
        const words = paragraphsClean[paraIndex].split(/\s+/);
        if (wordIndex >= 0 && wordIndex < words.length) {
            return words[wordIndex];
        }
    }
    return "";
};

const codedLines = [
    "A1S53 A2S27 A2S28 A2S29",
    "A4S5 A4S22 A4S23",
    "A1S13 A1S15 A1S16 A1S17 A1S10 A1S19",
    "A2S62 A3S31 A3S32 A1S22 A3S34",
    "A5S37 A1S4"
];

const decodedLines = codedLines.map(line => 
    line.split(" ")
        .map(decodeReference)
        .join(" ")
);

console.log(decodedLines);
console.log("{{FLG:ATLANTYDA}}")

