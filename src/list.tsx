import { List, ActionPanel, Action, Icon, Alert, showToast, confirmAlert, Toast, open } from "@raycast/api";
import { JSX, useEffect, useState } from "react";
import Favorite, { FavoriteEntry } from "./classes/favorite";

export default function Command(): JSX.Element {
    const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
    const [searchText, setSearchText] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFavorites = async () => {
            const favs: FavoriteEntry[] = await Favorite.getEntries();
            setFavorites(favs);
            setLoading(false);
        };

        fetchFavorites();
    }, []);

    return (
        <List
            isLoading={loading}
            searchText={searchText}
            onSearchTextChange={setSearchText}
            searchBarPlaceholder="Filter favorites by word..."
            filtering={true}
            isShowingDetail={true}
        >
            {!favorites.length ? (
                <List.EmptyView title="No favorites found" />
            ) : (
                Object.entries(
                    favorites.reduce(
                        (acc: { [lang: string]: { word: string; markdown: string; url: string }[] }, fav: FavoriteEntry) => {
                            if (!acc[fav.language]) acc[fav.language] = [];
                            acc[fav.language].push({
                                word: fav.word,
                                markdown: fav.markdown,
                                url: fav.url,
                            });
                            return acc;
                        },
                        {},
                    ),
                ).map(([lang, wordDefinition]: [string, { word: string; markdown: string; url: string }[]]) => (
                    <List.Section key={lang} title={lang.toUpperCase()}>
                        {wordDefinition
                            .filter((entry) => entry.word.toLowerCase().includes(searchText.toLowerCase()))
                            .map((entry) => (
                                <List.Item
                                    key={entry.word}
                                    title={entry.word}
                                    detail={<List.Item.Detail markdown={entry.markdown || "No details available."} />}
                                    actions={
                                        <ActionPanel>
                                            <Action
                                                title="Open in Browser"
                                                icon={Icon.Globe}
                                                onAction={(): void => {
                                                    const url: string = entry.url;
                                                    if (url) open(url);
                                                }}
                                            />
                                            <Action
                                                title="Remove from Favorites"
                                                icon={Icon.Trash}
                                                onAction={async (): Promise<void> => {
                                                    const options: Alert.Options = {
                                                        title: "Remove from Favorites",
                                                        message: `"${entry.word}" (${lang.toUpperCase()}) will be removed from your favorites`,
                                                        primaryAction: {
                                                            title: "Delete",
                                                            style: Alert.ActionStyle.Destructive,
                                                            onAction: async (): Promise<void> => {
                                                                await Favorite.removeEntry(lang, entry.word);

                                                                const favs: FavoriteEntry[] = await Favorite.getEntries();
                                                                setFavorites(favs);

                                                                await showToast({
                                                                    style: Toast.Style.Success,
                                                                    title: "Removed from Favorites",
                                                                    message: `"${entry.word}" (${lang.toUpperCase()}) has been removed from your favorites`,
                                                                });
                                                            },
                                                        },
                                                    };

                                                    await confirmAlert(options);
                                                }}
                                            />
                                        </ActionPanel>
                                    }
                                />
                            ))}
                    </List.Section>
                ))
            )}
        </List>
    );
}
