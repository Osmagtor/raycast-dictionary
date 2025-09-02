import {
    LaunchProps,
    ActionPanel,
    Action,
    Icon,
    Alert,
    confirmAlert,
    showToast,
    Toast,
    open,
    Clipboard,
    showHUD,
    List,
    Color,
} from "@raycast/api";
import { JSX, useEffect, useState } from "react";
import Dictionary, { GroupedEntry, Sense } from "./classes/dictionary";
import Favorite from "./classes/favorite";

export default function Command(props: LaunchProps<{ arguments: { word: string; language: string } }>): JSX.Element {
    let d: Dictionary;

    const colors: Color[] = [Color.Blue, Color.Green, Color.Magenta, Color.Orange, Color.Purple, Color.Red, Color.Yellow];

    const language: string = props.arguments.language;
    const word: string = props.arguments.word;

    const [groupedEntries, setGroupedEntries] = useState<GroupedEntry>({});
    const [exist, setExist] = useState<boolean>(false);
    const [searchText, setSearchText] = useState("");
    const [entryURL, setEntryURL] = useState<string>("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        d = new Dictionary(language, word);
        d.fetchEntry().then((ge: GroupedEntry) => {
            console.log(ge);
            setGroupedEntries(ge);
            setEntryURL(d.getURL);
            setLoading(false);
        });
    }, [language, word]);

    useEffect(() => {
        const checkExist = async () => {
            const result = await Favorite.exist(language, word);
            setExist(result);
        };
        checkExist();
    }, [language, word]);

    return (
        <List
            isLoading={loading}
            searchText={searchText}
            onSearchTextChange={setSearchText}
            searchBarPlaceholder="Filter by definition..."
            filtering={true}
            isShowingDetail={true}
        >
            {!Object.keys(groupedEntries).length ? (
                <List.EmptyView title="No definitions found" />
            ) : (
                Object.entries(groupedEntries).map(([partOfSpeech, entry], i: number) => {
                    const color: Color = colors[i % colors.length];

                    return (
                        <List.Section
                            key={partOfSpeech}
                            title={`${partOfSpeech.charAt(0).toUpperCase() + partOfSpeech.slice(1)} (${entry.senses.length})`}
                        >
                            {entry.senses.map((sense: Sense, j: number) => (
                                <List.Item
                                    key={`${word}-${partOfSpeech}-${j}`}
                                    title={""}
                                    icon={{
                                        source: Icon.Dot,
                                        tintColor: color,
                                    }}
                                    subtitle={sense.definition}
                                    detail={<List.Item.Detail markdown={sense.markdown || "No details available."} />}
                                    actions={
                                        <ActionPanel>
                                            <Action
                                                title="Open in Browser"
                                                icon={Icon.Globe}
                                                onAction={(): void => {
                                                    if (entryURL) open(entryURL);
                                                }}
                                            />
                                            <Action
                                                title={exist ? "Remove from Favorites" : "Add to Favorites"}
                                                icon={exist ? Icon.StarDisabled : Icon.Star}
                                                onAction={async (): Promise<void> => {
                                                    if (!exist) {
                                                        Favorite.addEntry(language, word, sense.markdown || "", entryURL || "");

                                                        await showToast({
                                                            style: Toast.Style.Success,
                                                            title: "Added to Favorites",
                                                            message: `"${word}" (${language.toUpperCase()}) has been added to your favorites`,
                                                        });

                                                        setExist(true);
                                                    } else {
                                                        const options: Alert.Options = {
                                                            title: "Remove from Favorites",
                                                            message: `"${word.slice(0, 1).toUpperCase()}${word.slice(1)}" (${language.toUpperCase()}) will be removed from your favorites`,
                                                            primaryAction: {
                                                                title: "Delete",
                                                                style: Alert.ActionStyle.Destructive,
                                                                onAction: async (): Promise<void> => {
                                                                    await showToast({
                                                                        style: Toast.Style.Success,
                                                                        title: "Removed from Favorites",
                                                                        message: `"${word.slice(0, 1).toUpperCase()}${word.slice(1)}" (${language.toUpperCase()}) has been removed from your favorites`,
                                                                    });
                                                                },
                                                            },
                                                        };

                                                        if (await confirmAlert(options)) {
                                                            Favorite.removeEntry(language, word);
                                                            setExist(false);
                                                        }
                                                    }
                                                }}
                                            />
                                            <Action
                                                title="Copy to Clipboard"
                                                icon={Icon.Clipboard}
                                                onAction={(): void => {
                                                    Clipboard.copy(sense.definition);
                                                    showHUD(
                                                        `The definitions for "${word}" (${language.toUpperCase()}) have been copied to clipboard`,
                                                    );
                                                }}
                                            />
                                        </ActionPanel>
                                    }
                                />
                            ))}
                        </List.Section>
                    );
                })
            )}
        </List>
    );
}
