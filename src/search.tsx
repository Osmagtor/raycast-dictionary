import { LaunchProps, Detail, ActionPanel, Action, Icon, Alert, confirmAlert, showToast, Toast, open, Clipboard, showHUD } from "@raycast/api";
import { JSX, useEffect, useState } from "react";
import Dictionary from "./classes/dictionary";
import Favorite from "./classes/favorite";

export default function Command(props: LaunchProps<{ arguments: { word: string; language: string } }>): JSX.Element {

    const language: string = props.arguments.language;
    const word: string = props.arguments.word;
    
    let d: Dictionary;

    const [markdown, setMarkdown] = useState<string>("Loading...");

    useEffect(() => {
        d = new Dictionary(language, word);
        d.fetchEntry().then((md: string) => setMarkdown(md));
    }, [language, word]);

    const [exist, setExist] = useState<boolean>(false);
    const title: string = exist ? "Remove from Favorites" : "Add to Favorites";

    useEffect(() => {
        const checkExist = async () => {
            const result = await Favorite.exist(language, word);
            setExist(result);
        };
        checkExist(); 
    }, [language, word]);

    return (
        <Detail
            markdown={markdown}
            actions={
                <ActionPanel>
                    <Action
                        title={title}
                        icon={Icon.Star}
                        onAction={
                            async (): Promise<void> => {
                                if (!exist) {

                                    Favorite.addEntry(language, word);

                                    await showToast({
                                        style: Toast.Style.Success,
                                        title: "Added to Favorites",
                                        message: `"${word.slice(0, 1).toUpperCase()}${word.slice(1)}" (${language.toUpperCase()}) has been added to your favorites`,
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
                            }
                        }
                    />
                    <Action
                        title="Open in Browser"
                        icon={Icon.Globe}
                        onAction={(): void => {
                            const url: string = d.getURL;
                            if (url) open(url);
                        }}
                    />
                    <Action
                        title="Copy to Clipboard"
                        icon={Icon.Clipboard}
                        onAction={(): void => {
                            Clipboard.copy(markdown);
                            showHUD(`The definitions for "${word}" (${language.toUpperCase()}) have been copied to clipboard`);
                        }}
                    />
                </ActionPanel>
            }
        />
    );
}