# Arkkitehtuurikuvaus

**Selkeä kerrosjako (MVVM tai vastaava):**
TaloFix noudattaa yksinkertaista MVVM-mallia. Näkymät ovat `src/features`-kansiossa, ViewModelit pitävät sovellustilan ja `src/data/repositories` hoitaa datan. Firebase-kutsut tehdään repoissa ja isommat/valtuutusta vaativat toiminnot ovat `functions/`-kansiossa.

**State-hallinta ja datavirta järkevästi:**
Tilaa hallitaan pääosin `zustand`-storeilla. ViewModelit pitävät usein `loading`/`error`/`refresh`-kenttiä, joten lataus- ja virhetilat näkyvät suoraan koodissa. Käytämme myös persist-ominaisuutta, jotta sovellus voi näyttää välimuistissa olevat tiedot ennen uutta hakua.

**Luettava koodi (nimeäminen, komponentointi, ei turhaa toistoa):**
Koodissa pyritään selkeään nimeämiseen ja kansiorakenteeseen. Usein toistuvat osat on paketoitu uudelleenkäytettäviksi komponenteiksi (esim. `GenericListScreen`, `TFButton`) tai util-funktioiksi. Käytämme i18n:ää (fi/en) ja TypeScriptin `strict`-tilaa, mikä auttaa koodin luettavuudessa.
