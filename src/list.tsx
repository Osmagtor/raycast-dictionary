import { List, ActionPanel, Action, Icon, Alert, showToast, confirmAlert, Toast, launchCommand, LaunchType } from "@raycast/api";
import { JSX, useEffect, useState } from "react";
import Favorite, { FavoriteEntry } from "./classes/favorite";

export default function Command(): JSX.Element {

    const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
    const [searchText, setSearchText] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {

        const fetchFavorites: Function = async () => {
            const favs: FavoriteEntry[] = await Favorite.getEntries();
            setFavorites(favs);
            setLoading(false);
        }

        fetchFavorites();
    }, []);

    return (
        <List
            isLoading={loading}
            searchText={searchText}
            onSearchTextChange={setSearchText}
            searchBarPlaceholder="Filter favorites by word..."
            filtering={true}
        >
            {
                !favorites.length
                    ? (
                        <List.EmptyView title="No favorites found" />
                    )
                    : (
                        Object.entries(
                            favorites.reduce((acc: { [lang: string]: string[] }, fav: FavoriteEntry) => {
                                if (!acc[fav.language]) acc[fav.language] = [];
                                acc[fav.language].push(fav.word);
                                return acc;
                            }, {})
                        ).map(([lang, words]: [string, string[]]) => (
                            <List.Section
                                key={lang}
                                title={lang.toUpperCase()}
                            >
                                {
                                    words.filter((word: string) => word.toLowerCase().includes(searchText.toLowerCase()))
                                        .map((word: string) => (
                                            <List.Item
                                                key={word}
                                                title={word}
                                                actions={
                                                    <ActionPanel>
                                                        <Action
                                                            title="View Definition"
                                                            icon={Icon.Book}
                                                            onAction={
                                                                async (): Promise<void> => {
                                                                    await launchCommand(
                                                                        {
                                                                            name: "search",
                                                                            type: LaunchType.UserInitiated,
                                                                            arguments: {
                                                                                word: word,
                                                                                language: lang
                                                                            }
                                                                        });
                                                                }
                                                            }
                                                        />
                                                        <Action
                                                            title="Remove from Favorites"
                                                            icon={Icon.Trash}
                                                            onAction={
                                                                async (): Promise<void> => {
                                                                    const options: Alert.Options = {
                                                                        title: "Remove from Favorites",
                                                                        message: `"${word.slice(0, 1).toUpperCase()}${word.slice(1)}" (${lang.toUpperCase()}) will be removed from your favorites`,
                                                                        primaryAction: {
                                                                            title: "Delete",
                                                                            style: Alert.ActionStyle.Destructive,
                                                                            onAction: async (): Promise<void> => {

                                                                                await Favorite.removeEntry(lang, word);

                                                                                const favs: FavoriteEntry[] = await Favorite.getEntries();
                                                                                setFavorites(favs);

                                                                                await showToast({
                                                                                    style: Toast.Style.Success,
                                                                                    title: "Removed from Favorites",
                                                                                    message: `"${word.slice(0, 1).toUpperCase()}${word.slice(1)}" (${lang.toUpperCase()}) has been removed from your favorites`,
                                                                                });
                                                                            },
                                                                        },
                                                                    };

                                                                    await confirmAlert(options);
                                                                }
                                                            }
                                                        />
                                                    </ActionPanel>
                                                }
                                            />
                                        ))
                                }
                            </List.Section>
                        ))
                    )
            }
        </List >
    );
}